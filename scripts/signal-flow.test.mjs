import test from 'node:test';
import assert from 'node:assert/strict';
import { SIGNAL_EDGES, SIGNAL_MODES, SIGNAL_NODES, nodeById } from '../src/data/signalFlow.js';

const validKinds = new Set(SIGNAL_MODES.filter(mode => mode.id !== 'all').map(mode => mode.id));

test('signal topology has unique nodes and valid scene links', () => {
  const ids = SIGNAL_NODES.map(node => node.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes('esp32'));
  assert.ok(ids.includes('battery'));
  assert.ok(ids.includes('lora'));
  assert.ok(ids.includes('antenna'));

  for (const node of SIGNAL_NODES) {
    assert.ok(node.scene && /^\d{2}$/.test(node.scene), `${node.id} must map to a component scene`);
    assert.ok(Number.isFinite(node.x) && Number.isFinite(node.y), `${node.id} must have graph coordinates`);
    assert.ok(node.interfaces.length > 0, `${node.id} must expose at least one interface`);
  }
});

test('every signal edge references real nodes and a supported channel', () => {
  const edgeIds = new Set();
  for (const edge of SIGNAL_EDGES) {
    assert.ok(nodeById[edge.from], `${edge.id} has unknown source ${edge.from}`);
    assert.ok(nodeById[edge.to], `${edge.id} has unknown target ${edge.to}`);
    assert.notEqual(edge.from, edge.to, `${edge.id} cannot self-connect`);
    assert.ok(validKinds.has(edge.kind), `${edge.id} has unsupported kind ${edge.kind}`);
    assert.ok(edge.label.length > 0);
    assert.ok(!edgeIds.has(edge.id), `duplicate edge id ${edge.id}`);
    edgeIds.add(edge.id);
  }
});

test('critical end-to-end system relationships are represented', () => {
  const has = (from, to, kind) => SIGNAL_EDGES.some(edge => edge.from === from && edge.to === to && edge.kind === kind);
  assert.ok(has('battery', 'converter', 'power'));
  assert.ok(has('converter', 'regulator', 'power'));
  assert.ok(has('regulator', 'esp32', 'power'));
  assert.ok(has('esp32', 'lora', 'data'));
  assert.ok(has('lora', 'antenna', 'rf'));
  assert.ok(has('heat-pipe', 'radiator', 'thermal'));
  assert.ok(SIGNAL_EDGES.filter(edge => edge.to === 'esp32' && edge.kind === 'data').length >= 5);
});
