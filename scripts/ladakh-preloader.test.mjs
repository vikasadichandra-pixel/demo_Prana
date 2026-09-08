import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LETTER_RIGS,
  clamp01,
  easeOutBounce,
  landingImpact,
  letterProgress,
} from '../src/lib/ladakhPreloader.js';

test('PRANA loader has five staggered terrain rigs', () => {
  assert.equal(LETTER_RIGS.length, 5);
  assert.deepEqual(LETTER_RIGS.map(item => item.glyph), ['P', 'R', 'A', 'N', 'A']);
  assert.equal(LETTER_RIGS[2].macron, true);
  assert.equal(LETTER_RIGS[3].dot, true);
  assert.ok(LETTER_RIGS.some(item => item.tilt > 0));
  assert.ok(LETTER_RIGS.some(item => item.tilt < 0));
});

test('letter progression is sequential rather than simultaneous', () => {
  assert.equal(letterProgress(0.1, 0), 0.5);
  assert.equal(letterProgress(0.1, 1), 0);
  assert.equal(letterProgress(0.5, 0), 1);
  assert.equal(letterProgress(0.5, 2), 0.5);
  assert.equal(letterProgress(1, 4), 1);
});

test('landing impact only occurs near the end of a drop', () => {
  assert.equal(landingImpact(0.5), 0);
  assert.ok(landingImpact(0.9) > 0);
  assert.equal(landingImpact(1), 0);
});

test('easing functions stay bounded', () => {
  for (const value of [-1, 0, 0.25, 0.5, 0.9, 1, 2]) {
    assert.ok(clamp01(value) >= 0 && clamp01(value) <= 1);
    assert.ok(easeOutBounce(value) >= 0 && easeOutBounce(value) <= 1.001);
  }
});
