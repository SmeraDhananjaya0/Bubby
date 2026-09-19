// coach — the in-app coach. Takes a message, answers in Bubbie's voice, and
// when the plan should change it PROPOSES structured changes; the app shows
// them as the strike-through list and the user approves each one, which
// calls decide_proposal(). The model never mutates the plan directly.
//
// POST { message }  →  { reply, proposals: [{ id, day, from, to }], fuel?: { kcal, protein_g, carbs_g } }
//
// Secrets: ANTHROPIC_API_KEY. Optional: COACH_MODEL (default claude-sonnet-4-5).
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const TZ = 'America/New_York';
const dayOf = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: TZ });

const SYSTEM = `You are the coach inside Bubbie, a marathon-training app where fuel follows the workout.
Voice: calm, specific, second person, short sentences, numbers first, no exclamation marks, no gamification.
You never change the plan yourself. When the plan should change, call propose_plan_changes with concrete
per-day changes and (if fueling changes) new daily targets; the runner approves each change in the app.
Protein stays steady day to day; calories and carbs follow the load. Injury, illness or travel → reduce or rest,
say when you'll check in, and tell them when to see a doctor or physio (swelling, locking, can't bear weight).
Keep replies under 120 words unless asked for detail.`;

const TOOL = {
  name: 'propose_plan_changes',
  description: 'Propose concrete changes to upcoming planned sessions and, optionally, today\'s fuel targets. Only call when the plan should actually change.',
  input_schema: {
    type: 'object',
    properties: {
      summary: { type: 'string', description: 'One line the app shows after the user applies, e.g. "4 rest days · back Wed with an easy 3 mi".' },
      changes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            session_id: { type: 'string', description: 'id of the planned session being changed (from context). Omit for a brand-new day.' },
            date: { type: 'string', description: 'YYYY-MM-DD' },
            from: { type: 'string', description: 'What was planned, short: "Long run 16 mi"' },
            to: { type: 'string', description: 'What it becomes, short: "Rest" or "Easy 3 mi, if pain-free"' },
            type: { type: 'string', enum: ['easy', 'recovery', 'intervals', 'tempo', 'long', 'rest'] },
            distance_mi: { type: 'number' },
            pace_target: { type: 'string' },
            zone: { type: 'string' },
            detail: { type: 'string' },
          },
          required: ['date', 'from', 'to', 'type'],
        },
      },
      fuel_today: {
        type: 'object',
        properties: { kcal: { type: 'integer' }, carbs_g: { type: 'integer' }, protein_g: { type: 'integer' }, reason: { type: 'string' } },
      },
    },
    required: ['summary', 'changes'],
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await db.auth.getUser();
    if (!user) return json({ error: 'not signed in' }, 401);
    const { message } = await req.json();
    if (!message || typeof message !== 'string') return json({ error: 'message required' }, 400);

    // ---- context ----
    const today = dayOf(new Date());
    const weekEnd = dayOf(new Date(Date.now() + 14 * 86400000));
    const [{ data: profile }, { data: sessions }, { data: goal }, { data: history }, nutrition, { data: recovery }] = await Promise.all([
      db.from('profiles').select('age, sex, height_in, weight_lb, diet, run_days_per_week').eq('id', user.id).single(),
      db.from('planned_sessions').select('id, date, title, type, detail, status, payload').eq('user_id', user.id).gte('date', today).lte('date', weekEnd).order('date'),
      db.from('goals').select('name, date, target_seconds').eq('user_id', user.id).order('date').limit(1).maybeSingle(),
      db.from('chat_messages').select('role, body, seq').eq('user_id', user.id).order('seq', { ascending: false }).limit(12),
      db.rpc('nutrition_day', { p_day: today }),
      db.from('recovery_snapshots').select('day, recovery_pct, hrv_ms, rhr').eq('user_id', user.id).order('day', { ascending: false }).limit(1).maybeSingle(),
    ]);

    const context = `Today: ${today}. Goal: ${goal ? `${goal.name} on ${goal.date}, target ${Math.floor(goal.target_seconds / 3600)}h${Math.round((goal.target_seconds % 3600) / 60)}m` : 'none set'}.
Profile: ${JSON.stringify(profile)}.
Recovery (latest): ${JSON.stringify(recovery)}.
Nutrition today: ${JSON.stringify(nutrition.data)}.
Upcoming sessions (next 14 days): ${JSON.stringify(sessions)}.`;

    const prior = (history ?? []).reverse().map((m) => ({ role: m.role === 'you' || m.role === 'user' ? 'user' : 'assistant', content: m.body }));
    const messages = [...prior, { role: 'user', content: message }];

    // ---- model ----
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '', 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: Deno.env.get('COACH_MODEL') ?? 'claude-sonnet-4-5',
        max_tokens: 1024,
        system: [{ type: 'text', text: SYSTEM }, { type: 'text', text: context }],
        tools: [TOOL],
        messages,
      }),
    });
    if (!res.ok) return json({ error: 'model call failed', detail: await res.text() }, 502);
    const out = await res.json();
    const reply = (out.content ?? []).filter((c: { type: string }) => c.type === 'text').map((c: { text: string }) => c.text).join('\n').trim();
    const tool = (out.content ?? []).find((c: { type: string; name?: string }) => c.type === 'tool_use' && c.name === 'propose_plan_changes');

    // ---- persist chat ----
    const nextSeq = ((history ?? [])[0]?.seq ?? 0) + 1;
    const stamp = Date.now();
    await db.from('chat_messages').insert([
      { id: `u-${stamp}`, user_id: user.id, role: 'user', body: message, seq: nextSeq, time_label: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ }) },
      { id: `c-${stamp}`, user_id: user.id, role: 'coach', body: reply || (tool ? tool.input.summary : '…'), seq: nextSeq + 1, proposal_refs: null },
    ]);

    // ---- persist proposals (the user decides in the app) ----
    const created: Array<{ id: string; day: string; from: string; to: string }> = [];
    if (tool) {
      const input = tool.input as { summary: string; changes: Array<Record<string, unknown>>; fuel_today?: Record<string, unknown> };
      for (const [i, ch] of input.changes.entries()) {
        const sess = (sessions ?? []).find((s) => s.id === ch.session_id) ?? (sessions ?? []).find((s) => s.date === ch.date);
        const id = `coach-${stamp}-${i}`;
        const after = {
          id: sess?.id ?? `coach-${ch.date}`,
          date: ch.date,
          title: String(ch.to),
          type: ch.type,
          detail: ch.detail ?? null,
          structure: [],
          status: 'planned',
          distanceMi: ch.distance_mi ?? (ch.type === 'rest' ? 0 : undefined),
          paceTarget: ch.pace_target,
          zone: ch.zone,
        };
        await db.from('proposals').insert({
          id, user_id: user.id, scope: 'session', session_id: sess?.id ?? after.id, status: 'proposed',
          payload: { source: 'coach', before: sess ?? null, after, from: ch.from, to: ch.to, summary: input.summary, message },
        });
        created.push({ id, day: String(ch.date), from: String(ch.from), to: String(ch.to) });
      }
      if (input.fuel_today) {
        const f = input.fuel_today;
        await db.from('daily_targets').upsert({
          user_id: user.id, day: today,
          kcal: Number(f.kcal), carbs_g: Number(f.carbs_g), protein_g: Number(f.protein_g),
          fat_g: Math.max(50, Math.round((Number(f.kcal) * 0.25) / 9)),
          reason: String(f.reason ?? input.summary), engine_version: 'coach',
        });
      }
      await db.from('chat_messages').update({ proposal_refs: created.map((c) => c.id) }).eq('user_id', user.id).eq('id', `c-${stamp}`);
    }

    return json({ reply, proposals: created, summary: tool?.input?.summary ?? null, fuel: tool?.input?.fuel_today ?? null });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
