import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, Pause, Play, RotateCcw } from 'lucide-react';
import {
  SIGNAL_COLORS,
  SIGNAL_EDGES,
  SIGNAL_MODES,
  SIGNAL_NODES,
  nodeById,
} from '../data/signalFlow';
import './SystemSignalFlow.css';
import './SystemSignalFlowRefinement.css';

const AUTO_TRACE = ['battery', 'converter', 'esp32', 'env-sensor', 'lora', 'antenna', 'heat-pipe'];

function connectionPath(from, to) {
  const horizontal = Math.abs(to.x - from.x) >= Math.abs(to.y - from.y);
  if (horizontal) {
    const mid = (from.x + to.x) / 2;
    return `M ${from.x} ${from.y} C ${mid} ${from.y}, ${mid} ${to.y}, ${to.x} ${to.y}`;
  }
  const mid = (from.y + to.y) / 2;
  return `M ${from.x} ${from.y} C ${from.x} ${mid}, ${to.x} ${mid}, ${to.x} ${to.y}`;
}

function traceNetwork(selectedId, edges, mode) {
  if (!selectedId) return { edgeIds: new Set(), nodeIds: new Set() };
  const edgeIds = new Set();
  const nodeIds = new Set([selectedId]);
  let frontier = new Set([selectedId]);
  const passes = mode === 'all' ? 1 : 3;

  for (let pass = 0; pass < passes; pass += 1) {
    const next = new Set();
    edges.forEach(edge => {
      if (!frontier.has(edge.from) && !frontier.has(edge.to)) return;
      edgeIds.add(edge.id);
      nodeIds.add(edge.from);
      nodeIds.add(edge.to);
      if (!frontier.has(edge.from)) next.add(edge.from);
      if (!frontier.has(edge.to)) next.add(edge.to);
    });
    frontier = new Set([...next].filter(id => ![...nodeIds].slice(0, -next.size).includes(id)));
    if (!frontier.size) break;
  }

  return { edgeIds, nodeIds };
}

function EdgeLabel({ edge }) {
  const from = nodeById[edge.from];
  const to = nodeById[edge.to];
  const x = (from.x + to.x) / 2;
  const y = (from.y + to.y) / 2;
  return (
    <g className="signal-edge-label" aria-hidden="true">
      <rect x={x - 66} y={y - 12} width="132" height="24" rx="6" />
      <text x={x} y={y + 3.5}>{edge.label}</text>
    </g>
  );
}

function SignalNode({ node, selected, active, muted, onSelect }) {
  const width = node.primary ? 210 : 172;
  const height = node.primary ? 76 : 62;
  return (
    <g
      className={`signal-node ${node.primary ? 'is-primary' : ''} ${selected ? 'is-selected' : ''} ${active ? 'is-active' : ''} ${muted ? 'is-muted' : ''}`}
      transform={`translate(${node.x} ${node.y})`}
      role="button"
      tabIndex="0"
      aria-label={`${node.label}. ${node.role}`}
      onClick={() => onSelect(node.id)}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(node.id);
        }
      }}
    >
      {node.primary && <circle className="signal-node-orbit orbit-a" r="74" />}
      {node.primary && <circle className="signal-node-orbit orbit-b" r="94" />}
      <rect className="signal-node-hit" x={-width / 2 - 10} y={-height / 2 - 10} width={width + 20} height={height + 20} rx="14" />
      <rect className="signal-node-shell" x={-width / 2} y={-height / 2} width={width} height={height} rx={node.primary ? 12 : 9} />
      <path className="signal-node-corner tl" d={`M ${-width/2 + 10} ${-height/2} h 18 M ${-width/2} ${-height/2 + 10} v 18`} />
      <path className="signal-node-corner br" d={`M ${width/2 - 10} ${height/2} h -18 M ${width/2} ${height/2 - 10} v -18`} />
      <circle className="signal-node-status" cx={-width / 2 + 16} cy={-height / 2 + 15} r="3.5" />
      <text className="signal-node-domain" x={-width / 2 + 28} y={-height / 2 + 19}>{node.domain}</text>
      <text className="signal-node-name" x="0" y={node.primary ? 8 : 8}>{node.short}</text>
      {node.primary && <text className="signal-node-sub" x="0" y="28">SYSTEM ORCHESTRATOR</text>}
    </g>
  );
}

export default function SystemSignalFlow() {
  const [mode, setMode] = useState('all');
  const [selectedId, setSelectedId] = useState('esp32');
  const [autoTrace, setAutoTrace] = useState(false);
  const [autoIndex, setAutoIndex] = useState(0);

  const visibleEdges = useMemo(
    () => mode === 'all' ? SIGNAL_EDGES : SIGNAL_EDGES.filter(edge => edge.kind === mode),
    [mode],
  );
  const trace = useMemo(() => traceNetwork(selectedId, visibleEdges, mode), [selectedId, visibleEdges, mode]);
  const selected = nodeById[selectedId];
  const selectedEdges = useMemo(
    () => SIGNAL_EDGES.filter(edge => edge.from === selectedId || edge.to === selectedId),
    [selectedId],
  );

  useEffect(() => {
    if (!autoTrace) return undefined;
    const timer = window.setInterval(() => {
      setAutoIndex(index => {
        const next = (index + 1) % AUTO_TRACE.length;
        setSelectedId(AUTO_TRACE[next]);
        return next;
      });
    }, 3600);
    return () => window.clearInterval(timer);
  }, [autoTrace]);

  const selectNode = id => {
    setSelectedId(id);
    setAutoTrace(false);
  };

  return (
    <section id="signal-flow" className="signal-flow" aria-label="Interactive PRANA system signal topology">
      <div className="signal-flow-atmosphere" aria-hidden="true"><i /><i /><b /></div>

      <div className="signal-flow-heading">
        <div>
          <p>PRĀŅA / DIGITAL TWIN <span>◆</span> LIVE TOPOLOGY</p>
          <h2>SEE THE SYSTEM<br /><em>THINK.</em></h2>
        </div>
        <div className="signal-flow-intro">
          <span>INTERACTIVE SIGNAL ARCHITECTURE</span>
          <p>Trace power, sensor data, control commands, RF paths and thermal transfer across the complete flight system. Select any subsystem to isolate its live relationships.</p>
        </div>
      </div>

      <div className="signal-flow-toolbar" role="toolbar" aria-label="Signal topology filters">
        <div className="signal-flow-modes">
          {SIGNAL_MODES.map(item => (
            <button
              key={item.id}
              type="button"
              className={mode === item.id ? 'is-active' : ''}
              onClick={() => setMode(item.id)}
              aria-pressed={mode === item.id}
            >
              <i style={item.id === 'all' ? undefined : { background: SIGNAL_COLORS[item.id] }} />
              {item.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`signal-auto ${autoTrace ? 'is-active' : ''}`}
          onClick={() => setAutoTrace(value => !value)}
          aria-pressed={autoTrace}
        >
          {autoTrace ? <Pause size={14} /> : <Play size={14} />}
          AUTO TRACE
        </button>
      </div>

      <div className="signal-flow-shell">
        <div className="signal-flow-stage" aria-label="System topology graph">
          <div className="signal-stage-chrome" aria-hidden="true">
            <span>GRAPH / 18 NODES</span><span>VECTOR BUS MAP / REV 02</span>
          </div>
          <svg viewBox="0 0 1640 850" preserveAspectRatio="xMidYMid meet" role="img" aria-label="PRANA signal flow map. Select a subsystem to trace connections.">
            <defs>
              <filter id="signal-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3.2" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              {Object.entries(SIGNAL_COLORS).map(([kind, color]) => (
                <marker key={kind} id={`arrow-${kind}`} viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
                </marker>
              ))}
            </defs>

            <g className="signal-grid" aria-hidden="true">
              {Array.from({ length: 15 }, (_, i) => <line key={`v-${i}`} x1={70 + i * 110} x2={70 + i * 110} y1="55" y2="810" />)}
              {Array.from({ length: 8 }, (_, i) => <line key={`h-${i}`} x1="50" x2="1590" y1={70 + i * 105} y2={70 + i * 105} />)}
              <circle cx="800" cy="415" r="142" /><circle cx="800" cy="415" r="270" />
            </g>

            <g className="signal-edges">
              {SIGNAL_EDGES.map(edge => {
                const from = nodeById[edge.from];
                const to = nodeById[edge.to];
                const path = connectionPath(from, to);
                const visible = mode === 'all' || edge.kind === mode;
                const active = visible && trace.edgeIds.has(edge.id);
                return (
                  <g key={edge.id} className={`signal-edge edge-${edge.kind} ${visible ? '' : 'is-hidden'} ${active ? 'is-active' : ''}`}>
                    <path className="signal-edge-base" d={path} />
                    {active && <>
                      <path className="signal-edge-live" d={path} style={{ stroke: SIGNAL_COLORS[edge.kind] }} markerEnd={`url(#arrow-${edge.kind})`} />
                      <circle className="signal-pulse" r="4.5" fill={SIGNAL_COLORS[edge.kind]} filter="url(#signal-glow)">
                        <animateMotion dur={edge.kind === 'data' ? '1.7s' : edge.kind === 'rf' ? '2.35s' : '2.05s'} repeatCount="indefinite" path={path} />
                      </circle>
                      <EdgeLabel edge={edge} />
                    </>}
                  </g>
                );
              })}
            </g>

            <g className="signal-nodes">
              {SIGNAL_NODES.map(node => (
                <SignalNode
                  key={node.id}
                  node={node}
                  selected={node.id === selectedId}
                  active={trace.nodeIds.has(node.id)}
                  muted={mode !== 'all' && !trace.nodeIds.has(node.id) && !visibleEdges.some(edge => edge.from === node.id || edge.to === node.id)}
                  onSelect={selectNode}
                />
              ))}
            </g>
          </svg>
          <div className="signal-stage-footer" aria-hidden="true">
            <span><i /> SIGNAL MODEL / SIMULATED FLOW</span>
            <span>SELECT NODE · FILTER BUS · TRACE PATH</span>
          </div>
        </div>

        <aside className="signal-inspector" aria-live="polite">
          <div className="signal-inspector-top">
            <p>SELECTED SUBSYSTEM</p>
            <button type="button" aria-label="Reset signal flow selection" onClick={() => { setSelectedId('esp32'); setMode('all'); setAutoTrace(false); setAutoIndex(0); }}><RotateCcw size={15} /></button>
          </div>
          <span className="signal-inspector-index">COMP / {selected.scene}</span>
          <h3>{selected.label}</h3>
          <p className="signal-inspector-role">{selected.role}</p>

          <div className="signal-inspector-status">
            <span><i /> STATUS</span><b>NOMINAL</b>
            <span>DOMAIN</span><b>{selected.domain}</b>
            <span>DIRECT LINKS</span><b>{String(selectedEdges.length).padStart(2, '0')}</b>
            <span>TRACE MODE</span><b>{mode.toUpperCase()}</b>
          </div>

          <div className="signal-inspector-interfaces">
            <p>INTERFACES</p>
            <div>{selected.interfaces.map(item => <span key={item}>{item}</span>)}</div>
          </div>

          <div className="signal-inspector-links">
            <p>ACTIVE RELATIONSHIPS</p>
            {selectedEdges.slice(0, 5).map(edge => {
              const peer = nodeById[edge.from === selectedId ? edge.to : edge.from];
              return <button key={edge.id} type="button" onClick={() => selectNode(peer.id)}>
                <i style={{ background: SIGNAL_COLORS[edge.kind] }} />
                <span><b>{peer.short}</b><small>{edge.label}</small></span>
                <ArrowDownRight size={14} />
              </button>;
            })}
          </div>

          <a className="signal-inspect-link" href={`#scene-${selected.scene}`}>
            INSPECT COMPONENT <ArrowDownRight size={15} />
          </a>
        </aside>
      </div>

      <div className="signal-flow-footer">
        <span>POWER / DATA / CONTROL / RF / THERMAL</span>
        <span className="signal-flow-legend">
          {Object.entries(SIGNAL_COLORS).map(([kind, color]) => <i key={kind}><b style={{ background: color }} />{kind}</i>)}
        </span>
        <span>TOPOLOGY STATUS / NOMINAL</span>
      </div>
    </section>
  );
}
