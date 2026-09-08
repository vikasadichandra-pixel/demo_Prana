export const MOUNTAIN_REVEAL_SECONDS = 1.35;
export const LETTER_SEQUENCE_SECONDS = 5.4;
export const LETTER_HOLD_SECONDS = 0.85;

export const LETTER_RIGS = [
  { id: 'p', glyph: 'P', x: -5.55, z: 0.28, tilt: -0.23, yaw: -0.12, scale: 0.92, fall: 8.8, drift: -0.7 },
  { id: 'r', glyph: 'R', x: -2.82, z: 0.04, tilt: 0.18, yaw: 0.13, scale: 0.88, fall: 9.6, drift: 0.48 },
  { id: 'a-macron', glyph: 'A', x: 0.05, z: -0.08, tilt: -0.045, yaw: -0.035, scale: 1.04, fall: 10.6, drift: -0.32, macron: true },
  { id: 'n-dot', glyph: 'N', x: 2.92, z: 0.08, tilt: 0.22, yaw: -0.14, scale: 0.9, fall: 9.7, drift: 0.58, dot: true },
  { id: 'a', glyph: 'A', x: 5.55, z: 0.34, tilt: -0.17, yaw: 0.12, scale: 0.86, fall: 8.9, drift: -0.52 },
];

export const clamp01 = value => Math.max(0, Math.min(1, value));
export const easeOutCubic = value => 1 - Math.pow(1 - clamp01(value), 3);

export function easeOutBounce(value) {
  const t = clamp01(value);
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) {
    const x = t - 1.5 / d1;
    return n1 * x * x + 0.75;
  }
  if (t < 2.5 / d1) {
    const x = t - 2.25 / d1;
    return n1 * x * x + 0.9375;
  }
  const x = t - 2.625 / d1;
  return n1 * x * x + 0.984375;
}

export function letterProgress(visualProgress, index) {
  return clamp01(visualProgress * LETTER_RIGS.length - index);
}

export function landingImpact(localProgress) {
  if (localProgress < 0.82 || localProgress >= 1) return 0;
  const t = (localProgress - 0.82) / 0.18;
  return Math.sin(Math.PI * clamp01(t));
}
