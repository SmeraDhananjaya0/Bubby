# Bubbie — visual spec

The look: Apple Health's bones (white cards on a soft ground, colored category headers, a floating pill tab bar)
with Bubbie's own accent set, an ambient glow that shifts hue per section, Manrope for numbers and UI, and one
line of Instrument Serif italic per screen as the editorial flare. Calm, gentle, a lot of white space, one strong
element per card.

Everything below is encoded in `src/theme/tokens.ts`. This document explains the *why* and shows how the pieces
compose. The wireframes in `canvas/` (open any `.dc.html` in a browser, or the whole canvas in Claude Design)
are the layout source of truth; `screens/` are screenshots of the running app.

## Color

| Token | Fill | Text | Use |
|---|---|---|---|
| ground | `#F6F5F1` | — | screen background (warm off-white) |
| card | `#FFFFFF` | — | every card |
| ink / ink2 / caption | — | `#1B1A19` / `#5E5D58` / `#6F6E67` | primary / secondary / caption text |
| hairline / field / track | `#F0EFEA` / `#F3F2EE` / `#EFEEE9` | — | dividers / inputs & secondary buttons / bar tracks |
| **accent** (electric blue) | `#2A52F0` | `#1F3FC9` | running, calories, race countdown, Today tab, step indicators |
| **teal** | `#22B3A6` | `#0E7C74` | trends, protein, Coach tab |
| **violet** | `#7C6CF2` | `#5B4BD6` | recovery, long runs, supplements, Plan tab |
| **green** | `#3DB877` | `#1F7F4A` | food, Log tab |
| **amber** | `#F5A623` | `#A65E00` | carbs, fueling protocol, tempo workouts |
| **sky** | `#46A3EA` | `#1F6FB5` | hydration, sodium, tomorrow, distance totals |

Each hue also has a `tint` (the fill at 12–16% alpha) for chips, icon circles and active tab capsules.
**Text always uses the `text` shade** (≥ 4.5:1 on white); **fills** go on rings, bars and dots (≥ 3:1).
Primary buttons are ink with white text — the accent is never a button fill.

Macros are fixed: calories → accent, carbs → amber, protein → teal, fat → violet. Workouts: easy → teal,
recovery → green, intervals → accent, tempo → amber, long → violet, rest → neutral.

### Ambient background

Three soft radial glows over the ground, alphas ≤ 0.45, positioned top-left / top-right / upper-middle so the
top third of the screen is gently colored and the rest is plain ground. Presets per section:

- **today / onboarding**: blue · sky · peach
- **plan**: lavender · blue · sky
- **log**: green · amber · sky
- **coach**: teal · lavender · peach

## Type

Manrope throughout; Instrument Serif italic for one line per screen (race name, "Eat for it.", a nudge headline).

| Preset | Face | Size / line | Tracking | Use |
|---|---|---|---|---|
| eyebrow | Manrope 700 | 12 / 16 | +0.08em, uppercase, caption color | date, step, "NEW FROM STRAVA" |
| title | Manrope 800 | 36 / 38 | −0.02em | screen title |
| hero | Manrope 800 | 48 / 46 | −0.04em | the one big number on a card |
| heroSm | Manrope 800 | 40 / 40 | −0.03em | secondary big number |
| stat | Manrope 800 | 26 / 28 | −0.03em | stat values, in the hue's text color |
| h2 / h3 | Manrope 800 | 26 / 30 · 20 / 24 | −0.02em | card headlines |
| cardTitle | Manrope 700 | 15 / 20 | — | card header, in the hue's text color |
| cardMeta | Manrope 600 | 13 / 18 | — | right-side meta, caption color |
| body | Manrope 500 | 15 / 22 | — | sentences |
| bodyMuted | Manrope 500 | 14 / 20 | — | secondary sentences, ink2 |
| label | Manrope 700 | 15 / 20 | — | list-row titles |
| small / caption | Manrope 600 · 500 | 13 / 18 · 12 / 16 | — | supporting text |
| micro | Manrope 700 | 11 / 14 | +0.04em, uppercase | axis labels, section eyebrows inside cards |
| serif | Instrument Serif italic | 32 / 34 | −0.01em | the flare |

Countdown number: Manrope 800 60/56, −0.05em, accent fill.

## Shape & space

- Card radius **24**, inner panels **16**, buttons **15**, CTAs **17**, chips **999**, sheet top corners **28**, tab bar **32**.
- Card padding **16 top / 18 sides / 18 bottom**; internal stack gap **14**; screen gutters **20**; cards stack with **14**.
- Shadows: card `0 1px 2px rgba(27,26,25,.04), 0 10px 30px rgba(27,26,25,.05)`; floating elements
  `0 1px 2px rgba(27,26,25,.06), 0 10px 30px rgba(27,26,25,.10)`.
- Hairlines `#F0EFEA` between list rows and above card footers.
- Bottom content padding **132** so the floating tab bar never covers a card.

## Components

- **Screen** — ground + ambient + scrolling stack of cards. Optional pinned `footer` (onboarding CTAs, coach composer).
- **Header** — eyebrow over title, optional right slot (avatar, pill button, close).
- **Card / CardHeader / CardFooter** — the grammar above. Header = hue icon (16) + hue title, muted meta or a `label ›` link on the right.
- **Button** — `primary` (ink pill, 46), `secondary` (field grey), `ghost` (text), `cta` (54, full width, pinned).
- **Chip** — tinted pill (hue) or neutral; `md` size for tappable chips (38 tall, radius 12).
- **Stat / StatRow** — label over number + small unit; three across in a card footer.
- **Bar / BarRow** — 8px progress bar; BarRow adds "name … value / goal unit".
- **Rings** — concentric progress rings, outer → inner, rounded caps, from 12 o'clock. Calories / carbs / protein.
- **WeekBars** — seven columns, ghost bar (plan or last week) with the actual bar over it; today highlighted.
- **BlockChart** — the training block's weekly-mileage silhouette; phases or current-week highlight.
- **TrendChart** — smoothed area line for weekly miles with a range toggle.
- **SegmentedControl**, **StepIndicator**, **Sheet** (bottom sheet over a dimmed backdrop), **FloatingTabBar**.

### Floating tab bar

A frosted white pill (64 tall, radius 32, 1px white border, float shadow) with four tabs — Today · Plan · Log ·
Coach — each an icon over an 11px label; the active tab gets a capsule in its section tint. A separate 64px circle
with a **+** sits to the right and opens quick-add on Log. 20px from the screen edges, 22px (or the safe area) from the bottom.

## Screen inventory

Onboarding (no tab bar, step indicator, pinned CTA):
1. **Welcome** — three rings, "Train for it." / *Eat for it.*, Connect Strava (primary), Connect Apple Health (secondary, iPhone tag), Skip.
2. **You're connected** — 2×2 stats (weekly avg, resting HR, max HR, threshold), 12-week bars, caption.
3. **About you** — age, sex (segmented), height, weight, diet/allergies.
4. **Your goal** — 2×2 distance tiles (accent ring on the selection), race date, goal time, run-days stepper, pace note, "not training for a race" escape hatch.
5. **Your plan** — weeks / runs / peak stats, block chart with phase strip, fueling note, Start training.

Tabs:
- **Today** — RaceCard (or NoRaceNudge) · FuelTodayCard (rings) · WorkoutCard (Mark as done) · FuelingCard (before/during/after + carry) · WeekAgainstPlanCard · TomorrowCard · RecoveryCard. Without a race: ThisWeekCard · rings · ProgressCard · nudge · PersonalBestsCard · RecoveryCard.
- **Plan** — week list (tap to expand: carbs / protein / effort / note), adaptive suggestion (Apply / Keep / Undo), training block, Distance / Avg fuel.
- **Log** — search-or-snap, Remaining (big number + three macro bars), Run fuel & supplements chips, Meals (dinner sheet), Hydration (+250 ml), link to Nutrients.
- **Coach** — thread with the coach avatar (violet sparkle), ink user bubbles, strike-through change list, Update my plan → confirmation + follow-up; composer pinned above the tab bar.

Pushed / modal:
- **Nutrients** — macros, five runner micros, supplements checklist.
- **Plan updated** — the synced run vs. plan, "Today, we added", tomorrow's move; Got it / Keep the original plan.
- **Yesterday** — two rings (calories, carbs) with % in the middle, eaten / carbs boxes, "Forgot to log something?", top-up card.

## Copy voice

Short, direct, second person, no exclamation marks, no gamification. Numbers first ("+60 g carbs before your run"),
reasons second ("so the workout lands on fresher legs"). The coach is calm and specific, and always says what it
would change before changing it.
