export const MOUNTAIN_REVEAL_SECONDS = 1.25;
export const LETTER_SEQUENCE_SECONDS = 5.6;
export const LETTER_HOLD_SECONDS = 0.95;

// Hand-directed landing anchors. They deliberately do not share a baseline:
// every glyph belongs to a different ridge, depth plane and slope.
export const LETTER_RIGS = [
  { id: 'p', glyph: 'P', x: -5.9, z: 0.42, tilt: -0.19, yaw: -0.15, scale: 0.95, fall: 10.4, drift: -0.82, impact: 1.0 },
  { id: 'r', glyph: 'R', x: -3.12, z: -0.34, tilt: 0.16, yaw: 0.12, scale: 0.9, fall: 11.0, drift: 0.64, impact: 0.95 },
  { id: 'a-macron', glyph: 'A', x: 0.0, z: -0.82, tilt: -0.025, yaw: -0.035, scale: 1.09, fall: 12.0, drift: -0.4, impact: 1.18, macron: true },
  { id: 'n-dot', glyph: 'N', x: 3.02, z: -0.18, tilt: 0.22, yaw: -0.13, scale: 0.92, fall: 11.2, drift: 0.72, impact: 1.0, dot: true },
  { id: 'a', glyph: 'A', x: 5.72, z: 0.5, tilt: -0.16, yaw: 0.16, scale: 0.9, fall: 10.5, drift: -0.64, impact: 0.96 },
];

export const clamp01 = value => Math.max(0, Math.min(1, value));
export const easeOutCubic = value => 1 - Math.pow(1 - clamp01(value), 3);
export const easeInCubic = value => Math.pow(clamp01(value), 3);

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

// Punchy impact envelope for camera kick/squash. The longer residual snow plume
// is clock-driven in the Three scene so it can outlive the letter's progress slot.
export function landingImpact(localProgress) {
  if (localProgress < 0.74 || localProgress >= 1) return 0;
  const t = (localProgress - 0.74) / 0.26;
  return Math.sin(Math.PI * clamp01(t));
}

export function landingBounce(localProgress) {
  if (localProgress <= 0.76) return 0;
  const t = clamp01((localProgress - 0.76) / 0.24);
  return Math.abs(Math.sin(t * Math.PI * 2.35)) * Math.exp(-5.6 * t);
}
