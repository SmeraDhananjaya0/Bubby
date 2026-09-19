/**
 * Bubbie design tokens — the single source of truth for the look.
 *
 * Every value here comes straight from the design canvas (see design/DESIGN.md).
 * Screens and components import from this file; never hard-code a color or radius
 * in a screen. If a new color is needed, add it here first.
 */

export type Hue = {
  /** Fills: rings, bars, buttons, dots. Contrast ≥ 3:1 on white. */
  fill: string;
  /** Text and icons on white or on the tint. Contrast ≥ 4.5:1 on white. */
  text: string;
  /** Soft background for chips, icon circles, tab highlights. */
  tint: string;
};

export const hues = {
  /** Primary accent: running, calories, race, the Today tab. */
  accent: { fill: '#2A52F0', text: '#1F3FC9', tint: 'rgba(42, 82, 240, 0.12)' },
  /** Trends, protein, the Coach tab. */
  teal: { fill: '#22B3A6', text: '#0E7C74', tint: 'rgba(34, 179, 166, 0.14)' },
  /** Recovery, long runs, supplements, the Plan tab. */
  violet: { fill: '#7C6CF2', text: '#5B4BD6', tint: 'rgba(124, 108, 242, 0.14)' },
  /** Fuel / food, the Log tab. */
  green: { fill: '#3DB877', text: '#1F7F4A', tint: 'rgba(61, 184, 119, 0.14)' },
  /** Carbs, fueling protocol, tempo workouts. */
  amber: { fill: '#F5A623', text: '#A65E00', tint: 'rgba(245, 166, 35, 0.16)' },
  /** Hydration, sodium, tomorrow, distance totals. */
  sky: { fill: '#46A3EA', text: '#1F6FB5', tint: 'rgba(70, 163, 234, 0.14)' },
} satisfies Record<string, Hue>;

export type HueName = keyof typeof hues;

export const colors = {
  ground: '#F6F5F1',
  card: '#FFFFFF',
  cardGlass: 'rgba(255, 255, 255, 0.8)',
  ink: '#1B1A19',
  ink2: '#5E5D58',
  caption: '#6F6E67',
  disabled: '#B5B4AD',
  hairline: '#F0EFEA',
  field: '#F3F2EE',
  track: '#EFEEE9',
  trackDark: '#ECEBE6',
  stepOff: '#E4E3DD',
  tint: '#FAF9F5',
  white: '#FFFFFF',
  ...hues,
};

/** Macro → hue mapping used everywhere macros appear. */
export const macroHue = {
  calories: hues.accent,
  carbs: hues.amber,
  protein: hues.teal,
  fat: hues.violet,
} as const;

/** Workout type → hue. Rest is neutral. */
export const workoutHue = {
  easy: hues.teal,
  recovery: hues.green,
  intervals: hues.accent,
  tempo: hues.amber,
  long: hues.violet,
  rest: { fill: '#DDDCD6', text: '#5E5D58', tint: '#F3F2EE' },
} satisfies Record<string, Hue>;

export const radii = {
  card: 24,
  cardInner: 16,
  button: 15,
  cta: 17,
  chip: 999,
  field: 13,
  sheet: 28,
  tabBar: 32,
};

export const spacing = {
  screenX: 20,
  cardX: 18,
  cardTop: 16,
  cardBottom: 18,
  stack: 14,
  /** Bottom padding on scroll content so the floating tab bar never covers a card. */
  tabBarClearance: 132,
};

/** react-native `boxShadow` strings (new architecture). */
export const shadows = {
  card: '0 1px 2px rgba(27, 26, 25, 0.04), 0 10px 30px rgba(27, 26, 25, 0.05)',
  float: '0 1px 2px rgba(27, 26, 25, 0.06), 0 10px 30px rgba(27, 26, 25, 0.10)',
  chip: '0 1px 2px rgba(27, 26, 25, 0.08)',
  sheet: '0 -10px 40px rgba(27, 26, 25, 0.14)',
};

export const fonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
  /** The editorial flare: race names, headlines, one line per screen at most. */
  serifItalic: 'InstrumentSerif_400Regular_Italic',
};

/**
 * Type scale. Use these objects directly in StyleSheet (`...type.title`).
 * Letter-spacing is in px (RN), converted from the em values on the canvas.
 */
export const type = {
  eyebrow: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, letterSpacing: 0.96, textTransform: 'uppercase' as const, color: colors.caption },
  title: { fontFamily: fonts.extrabold, fontSize: 36, lineHeight: 38, letterSpacing: -0.72, color: colors.ink },
  cardTitle: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 },
  cardMeta: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.caption },
  hero: { fontFamily: fonts.extrabold, fontSize: 48, lineHeight: 46, letterSpacing: -1.92, color: colors.ink },
  heroSm: { fontFamily: fonts.extrabold, fontSize: 40, lineHeight: 40, letterSpacing: -1.2, color: colors.ink },
  stat: { fontFamily: fonts.extrabold, fontSize: 26, lineHeight: 28, letterSpacing: -0.78, color: colors.ink },
  h2: { fontFamily: fonts.extrabold, fontSize: 26, lineHeight: 30, letterSpacing: -0.52, color: colors.ink },
  h3: { fontFamily: fonts.extrabold, fontSize: 20, lineHeight: 24, letterSpacing: -0.2, color: colors.ink },
  body: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22, color: colors.ink },
  bodyMuted: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.ink2 },
  label: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, color: colors.ink },
  small: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.ink2 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.caption },
  captionBold: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, color: colors.caption },
  micro: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, letterSpacing: 0.44, textTransform: 'uppercase' as const, color: colors.caption },
  serif: { fontFamily: fonts.serifItalic, fontSize: 32, lineHeight: 34, letterSpacing: -0.32, color: colors.ink },
};

/**
 * Ambient background presets: three soft radial glows per section.
 * [x%, y%, rx%, ry%, rgba]. Keep alphas ≤ 0.45 — "ambient, not overdone".
 */
export type Glow = { cx: number; cy: number; rx: number; ry: number; color: string; alpha: number };
export const ambients: Record<'today' | 'plan' | 'log' | 'coach' | 'onboarding', Glow[]> = {
  today: [
    { cx: 6, cy: -4, rx: 90, ry: 40, color: '#6E8CFA', alpha: 0.42 },
    { cx: 100, cy: 0, rx: 80, ry: 36, color: '#96BEFA', alpha: 0.42 },
    { cx: 55, cy: 14, rx: 70, ry: 28, color: '#FFDEAA', alpha: 0.34 },
  ],
  plan: [
    { cx: 4, cy: -4, rx: 90, ry: 40, color: '#B4AAFA', alpha: 0.4 },
    { cx: 100, cy: 0, rx: 80, ry: 36, color: '#6E8CFA', alpha: 0.36 },
    { cx: 55, cy: 14, rx: 70, ry: 28, color: '#96BEFA', alpha: 0.26 },
  ],
  log: [
    { cx: 4, cy: -4, rx: 90, ry: 40, color: '#96DCAA', alpha: 0.42 },
    { cx: 100, cy: 0, rx: 80, ry: 36, color: '#FFCD78', alpha: 0.4 },
    { cx: 55, cy: 14, rx: 70, ry: 28, color: '#96BEFA', alpha: 0.22 },
  ],
  coach: [
    { cx: 4, cy: -4, rx: 90, ry: 40, color: '#78D2C8', alpha: 0.42 },
    { cx: 100, cy: 0, rx: 80, ry: 36, color: '#B4AAFA', alpha: 0.42 },
    { cx: 55, cy: 14, rx: 70, ry: 28, color: '#FFDEAA', alpha: 0.28 },
  ],
  onboarding: [
    { cx: 6, cy: -4, rx: 90, ry: 40, color: '#6E8CFA', alpha: 0.42 },
    { cx: 100, cy: 0, rx: 80, ry: 36, color: '#96BEFA', alpha: 0.42 },
    { cx: 55, cy: 14, rx: 70, ry: 28, color: '#FFDEAA', alpha: 0.34 },
  ],
};
