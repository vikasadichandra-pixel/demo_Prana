import React, { useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { ChevronDown, Cpu, Layers3 } from 'lucide-react';
import { scenes } from './data/scenes';
import ExplodedComponentSection from './components/ExplodedComponentSection';
import MasterDroneExploder from './components/PranaWebGL';
import SystemSignalFlow from './components/SystemSignalFlow';
import Preloader from './components/Preloader';
import useSteadyScroll from './hooks/useSteadyScroll';
import './styles.css';
import './prana-theme.css';

function App() {
  const [introPhase, setIntroPhase] = useState('loading');
  useSteadyScroll(introPhase==='ready');

  const reveal = useCallback(() => setIntroPhase('arriving'), []);
  const complete = useCallback(() => setIntroPhase('ready'), []);

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────────
          PRELOADER — Renders first, locks scroll, unmounts on complete
          ───────────────────────────────────────────────────────────────── */}
      <Preloader onReveal={reveal} onComplete={complete} />

      {/* ─────────────────────────────────────────────────────────────────
          MAIN APP — Warms the viewer behind the flight sequence
          ───────────────────────────────────────────────────────────────── */}
        <main inert={introPhase!=='ready'?true:undefined}>
          <header>
            <a href="#top">PRĀŅA<span className="brand-system"> / SYSTEMS</span></a>
            <span>HOMEOSTATIC FLIGHT SYSTEM / SIH26</span>
            <span className="nominal">SYSTEM STATUS / NOMINAL</span>
          </header>

          {/* Jaw-dropping drone scroll animation at the very top */}
          <MasterDroneExploder introPhase={introPhase} />

          <section className="hero" id="architecture">
            <div className="hero-grid" />
            <div className="hero-copy">
              <p>COMPLETE HARDWARE ARCHITECTURE</p>
              <h1>ENGINEERED<br />TO <em>SURVIVE.</em></h1>
              <span>A component-by-component engineering inspection of the complete hardware system.</span>
            </div>
            <div className="hero-object">
              <Layers3 size={62} /><i /><Cpu size={112} /><i />
              <b>CONTROL · POWER · SENSORS<br />THERMAL · DATA · PROTECTION</b>
            </div>
            <footer>SCROLL TO TRACE THE SYSTEM <ChevronDown size={17} /></footer>
          </section>

          <SystemSignalFlow />

          <nav aria-label="Component progression">
            <i />
            {scenes.map(scene => (
              <a key={scene.index} href={`#scene-${scene.index}`}>{scene.index}</a>
            ))}
          </nav>

          {scenes.map(scene => (
            <div id={`scene-${scene.index}`} key={scene.index}>
              <ExplodedComponentSection scene={scene} />
            </div>
          ))}

          <section className="complete">
            <p>{scenes.length} / COMPLETE SYSTEM</p>
            <h2>NOT AN ARMOUR<br />NOT A PATCH.<br />A BREATHE</h2>
            <div>
              {['CONTROL', 'POWER', 'SENSORS', 'THERMAL', 'COMMUNICATION', 'PROTECTION', 'DATA'].map(item => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </section>
        </main>
    </>
  );
}

// Keep the root across Vite updates so design edits do not mount a second app.
const appRoot = import.meta.hot?.data.root ?? createRoot(document.getElementById('root'));
if (import.meta.hot) import.meta.hot.data.root = appRoot;
appRoot.render(<App />);
