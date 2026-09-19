// strava-auth — exchange a Strava OAuth code for tokens and store them encrypted.
//
// POST  { code, redirect_uri }         → { athlete: { id, firstname, lastname } }
// POST  { action: "disconnect" }       → { ok: true }
//
// Caller: the app, with the user's Supabase JWT (verify_jwt = true).
// Secrets: STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, TOKEN_ENC_KEY (base64, 32 bytes).
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// ---- AES-256-GCM, columns: ciphertext / iv / tag (all base64) ----
const b64 = (u8: Uint8Array) => btoa(String.fromCharCode(...u8));
async function encKey() {
  const raw = Uint8Array.from(atob(Deno.env.get('TOKEN_ENC_KEY') ?? ''), (c) => c.charCodeAt(0));
  if (raw.length !== 32) throw new Error('TOKEN_ENC_KEY must be 32 bytes, base64');
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt']);
}
export async function seal(plain: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const out = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await encKey(), new TextEncoder().encode(plain)));
  return { ciphertext: b64(out.slice(0, -16)), tag: b64(out.slice(-16)), iv: b64(iv) };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: 'not signed in' }, 401);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const body = await req.json().catch(() => ({}));

    if (body.action === 'disconnect') {
      await admin.from('integration_tokens').delete().eq('user_id', user.id).eq('provider', 'strava');
      return json({ ok: true });
    }

    if (!body.code) return json({ error: 'code required' }, 400);
    const res = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: Deno.env.get('STRAVA_CLIENT_ID'),
        client_secret: Deno.env.get('STRAVA_CLIENT_SECRET'),
        code: body.code,
        grant_type: 'authorization_code',
      }),
    });
    if (!res.ok) return json({ error: 'strava rejected the code', detail: await res.text() }, 400);
    const tok = await res.json();

    // Store the refresh token + current access token together; strava-sync refreshes as needed.
    const sealed = await seal(JSON.stringify({ access_token: tok.access_token, refresh_token: tok.refresh_token }));
    const { error } = await admin.from('integration_tokens').upsert({
      user_id: user.id,
      provider: 'strava',
      ...sealed,
      expires_at: new Date(tok.expires_at * 1000).toISOString(),
      athlete_ref: String(tok.athlete?.id ?? ''),
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;

    return json({ athlete: { id: tok.athlete?.id, firstname: tok.athlete?.firstname, lastname: tok.athlete?.lastname } });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
