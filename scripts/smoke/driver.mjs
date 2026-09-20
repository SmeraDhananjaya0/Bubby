// Smoke test: drives the exported web app (dist/) through onboarding as a guest over the Chrome
// DevTools Protocol — bad inputs are rejected, a plan is built, Today / Plan / edit / Settings render
// without NaN or console errors. Run with `npm run smoke:web` (builds, serves, launches headless Chrome).
import fs from 'node:fs';
const SHOTS = process.argv[2];
const BASE = process.argv[3] ?? 'http://localhost:4173';
const DEBUG = process.argv[4] ?? 'http://127.0.0.1:9222';
// A Sunday about 11 weeks out, so the plan has base, build, peak and taper and the date is always valid.
const raceDay = (() => { const d = new Date(); d.setDate(d.getDate() + 77 - ((d.getDay() + 0) % 7)); return d; })();
const RACE_ISO = raceDay.toLocaleDateString('en-CA');
const RACE_LABEL = raceDay.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const monthsAhead = (raceDay.getFullYear() - new Date().getFullYear()) * 12 + raceDay.getMonth() - new Date().getMonth();
const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const version = await (await fetch(DEBUG + '/json/version')).json();
const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let seq = 0; const pending = new Map(); const events = [];
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id) { pending.get(d.id)?.(d); pending.delete(d.id); } else events.push(d); };
const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const id = ++seq; pending.set(id, (d) => (d.error ? rej(new Error(method + ': ' + JSON.stringify(d.error))) : res(d.result))); ws.send(JSON.stringify({ id, method, params, sessionId })); });

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const cmd = (m, p) => send(m, p, sessionId);
await cmd('Page.enable'); await cmd('Runtime.enable'); await cmd('Log.enable');
await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
setInterval(() => { while (events.length) { const e = events.shift(); if (e.method === 'Runtime.exceptionThrown') errors.push('EXCEPTION ' + (e.params.exceptionDetails.exception?.description ?? e.params.exceptionDetails.text)); if (e.method === 'Runtime.consoleAPICalled' && (e.params.type === 'error' || e.params.type === 'warning')) errors.push(e.params.type.toUpperCase() + ' ' + e.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300)); if (e.method === 'Log.entryAdded' && e.params.entry.level === 'error') errors.push('LOG ' + e.params.entry.text.slice(0, 300)); } }, 50);

const evalJs = async (expr) => { const r = await cmd('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)); return r.result.value; };
const text = () => evalJs('document.body.innerText');
const waitFor = async (needle, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if ((await text()).toLowerCase().includes(needle.toLowerCase())) return; await sleep(200); } throw new Error(`timeout waiting for "${needle}". Page has: ${(await text()).slice(0, 400)}`); };
const rectOf = (finder) => evalJs(`(() => { const el = (${finder})(); if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, disabled: el.getAttribute('aria-disabled') }; })()`);
const clickAt = async (r) => { await cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r.x, y: r.y }); await cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await sleep(400); };
const byLabel = (label) => `() => document.querySelector('[aria-label="${label}"]')`;
const byText = (t) => `() => [...document.querySelectorAll('div,span')].filter(e => e.children.length === 0 && e.textContent.trim() === ${JSON.stringify(t)}).pop()`;
const click = async (finder, what) => { await sleep(150); const r = await rectOf(finder); if (!r) throw new Error('not found: ' + what); await clickAt(r); };
const type = async (label, value) => evalJs(`(() => { const el = document.querySelector('input[aria-label="${label}"]'); if (!el) return 'missing ' + ${JSON.stringify(label)}; el.focus(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);
const shot = async (name) => { const r = await cmd('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); fs.writeFileSync(`${SHOTS}/${name}.png`, Buffer.from(r.data, 'base64')); console.log('  shot', name); };
const fullShot = async (name) => { const h = await evalJs('Math.min(4000, document.documentElement.scrollHeight)'); await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: h, deviceScaleFactor: 1.5, mobile: true }); await sleep(300); await shot(name); await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }); };
const assert = (ok, msg) => { console.log((ok ? '  ok  ' : '  FAIL') + ' ' + msg); if (!ok) errors.push('ASSERT ' + msg); };
const noNaN = async (where) => { const t = await text(); assert(!/NaN|undefined|Invalid Date/.test(t), `no NaN/undefined on ${where}`); };
const disabledOf = async (label) => (await rectOf(byLabel(label)))?.disabled;

try {
  // Seed a guest session so the entry gate sends us to onboarding.
  await cmd('Page.navigate', { url: BASE + '/' }); await sleep(1500);
  await evalJs(`localStorage.clear(); localStorage.setItem('bubbie:auth', JSON.stringify({ state: { user: { id: 'guest', name: 'Guest', email: '', provider: 'guest' } }, version: 0 })); 'seeded'`);
  await cmd('Page.navigate', { url: BASE + '/' });
  console.log('welcome'); await waitFor('Train for it.');
  await click(byLabel('Skip for now'), 'Skip for now');

  console.log('about you'); await waitFor('About you');
  await type('Age', '5'); await sleep(200);
  assert((await text()).includes('Enter an age between 13 and 100.'), 'age error shows');
  assert((await disabledOf('Continue')) === 'true', 'Continue disabled with bad age');
  await type('Age', '29'); await sleep(200);
  assert((await disabledOf('Continue')) !== 'true', 'Continue enabled with good age');
  await shot('02-about-you');
  await click(byLabel('Continue'), 'Continue');

  console.log('goal'); await waitFor('Your goal');
  assert((await disabledOf('Build my plan')) === 'true', 'Build disabled with no race name');
  await type('Race name', 'Brooklyn Half');
  await click(byText('Half'), 'Half tile');
  await type('Race date, year month day', `${new Date().getFullYear()}-02-30`); await sleep(200);
  assert((await text()).includes("That isn't a real date"), 'bad date flagged');
  assert((await disabledOf('Build my plan')) === 'true', 'Build disabled with bad date');
  await type('Race date, year month day', new Date(Date.now() - 86400000 * 3).toLocaleDateString('en-CA')); await sleep(200);
  assert((await text()).includes('needs to be in the future'), 'past date flagged');
  await type('Goal time', '1:70:00'); await sleep(200);
  assert((await text()).includes('Use H:MM:SS'), 'bad goal time flagged');
  await shot('03-goal-errors');
  await type('Race date, year month day', RACE_ISO); await type('Goal time', '1:55:00'); await sleep(300);
  assert((await text()).includes('weeks out at'), 'summary note shows weeks + pace');
  assert((await disabledOf('Build my plan')) !== 'true', 'Build enabled once valid');
  await noNaN('goal');
  await fullShot('03-goal-valid');
  await click(byLabel('Build my plan'), 'Build my plan');

  console.log('plan preview'); await waitFor('Your plan');
  await waitFor('Weekly miles');
  assert(/brooklyn half/i.test(await text()), 'preview names the race');
  await noNaN('plan preview');
  await fullShot('04-plan-preview');
  await click(byLabel('Start training'), 'Start training');

  console.log('today'); await waitFor('Goal race');
  const today = await text();
  assert(today.includes('Brooklyn Half'), 'Today shows the race');
  assert(/\b\d+\s*\n?\s*days/i.test(today), 'countdown is a number');
  assert(/baseline/.test(today), 'fuel card shows baseline split');
  await noNaN('today');
  await fullShot('05-today');

  console.log('plan tab'); await cmd('Page.navigate', { url: BASE + '/plan' }); await waitFor('Calendar');
  const plan = await text();
  assert(/week 1 of \d+/i.test(plan), 'plan header shows week 1 of N');
  assert(plan.includes('Built from your Strava history') || plan.includes('Built from the defaults'), 'seed card shown');
  assert(!plan.includes('Recovery dipped to 61'), 'sample suggestion hidden on a real plan');
  await noNaN('plan');
  await fullShot('06-plan');
  await rectOf(byText('Calendar')); await sleep(300); await shot('06b-plan-calendar');
  // Tap a future day on the calendar (the race day flag) and check its detail.
  for (let k = 0; k < monthsAhead; k++) await click(byLabel('Next month'), 'next month');
  await click(byLabel(`${RACE_LABEL}, Long run 13.1 miles`), 'race day cell');
  assert((await text()).includes('Race day. Goal 1:55:00'), 'race day detail opens');
  await rectOf(byText('Calendar')); await sleep(300); await shot('07-plan-raceday');

  console.log('edit race'); await cmd('Page.navigate', { url: BASE + '/goal' }); await waitFor('Edit race');
  assert((await text()).includes('Save & rebuild plan'), 'edit mode CTA');
  await type('Goal time', '1:50:00'); await sleep(200);
  await click(byLabel('Save & rebuild plan'), 'save');
  await sleep(800);
  await cmd('Page.navigate', { url: BASE + '/' }); await waitFor('Goal race');
  assert((await text()).includes('Goal 1:50:00'), 'edited goal shows on Today');
  await fullShot('08-today-after-edit');

  console.log('settings'); await cmd('Page.navigate', { url: BASE + '/settings' }); await waitFor('Settings');
  assert((await text()).includes('Brooklyn Half'), 'settings lists the race');
  await shot('09-settings');
} catch (e) { errors.push('DRIVER ' + e.message); }

console.log('\nerrors:', errors.length ? '\n  ' + errors.join('\n  ') : 'none');
ws.close(); process.exit(errors.some((e) => e.startsWith('ASSERT') || e.startsWith('DRIVER') || e.startsWith('EXCEPTION')) ? 1 : 0);
