import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGLTF, useProgress } from '@react-three/drei';
import LadakhPreloaderScene from './LadakhPreloaderScene';
import './Preloader.css';

const MAIN_MODEL = `${import.meta.env.BASE_URL}models/prana-survival.glb?v=3`;
useGLTF.preload(MAIN_MODEL);

class PreloaderBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure?.(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function Preloader({ onComplete, onReveal }) {
  const [done, setDone] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [graceReady, setGraceReady] = useState(false);
  const [forceReady, setForceReady] = useState(false);
  const completed = useRef(false);
  const exitTimer = useRef();
  const { active, progress, total } = useProgress();

  const loadProgress = useMemo(() => {
    if (forceReady) return 100;
    if (total > 0) return progress;
    return graceReady && !active ? 100 : 0;
  }, [active, forceReady, graceReady, progress, total]);

  const finish = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    setLeaving(true);
    onReveal?.();
    exitTimer.current = window.setTimeout(() => {
      setDone(true);
      onComplete?.();
    }, 880);
  }, [onComplete, onReveal]);

  useEffect(() => {
    const grace = window.setTimeout(() => setGraceReady(true), 720);
    const fallback = window.setTimeout(() => setForceReady(true), 11000);
    return () => {
      window.clearTimeout(grace);
      window.clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    if (!failed) return undefined;
    const timer = window.setTimeout(finish, 900);
    return () => window.clearTimeout(timer);
  }, [failed, finish]);

  useEffect(() => {
    if (done) return undefined;
    const previousOverflow = document.body.style.overflow;
    const restoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    document.body.style.overflow = 'hidden';
    window.scrollTo({ top: 0, behavior: 'instant' });
    return () => {
      document.body.style.overflow = previousOverflow;
      window.history.scrollRestoration = restoration;
    };
  }, [done]);

  useEffect(() => () => window.clearTimeout(exitTimer.current), []);

  if (done) return null;

  return (
    <div
      className={`preloader${leaving ? ' is-leaving' : ''}${failed ? ' is-fallback' : ''}`}
      role="status"
      aria-label="Loading PRĀŅA high-altitude system"
    >
      <div className="preloader__canvas" aria-hidden="true">
        {!failed && (
          <PreloaderBoundary onFailure={() => setFailed(true)}>
            <LadakhPreloaderScene loadProgress={loadProgress} onSequenceComplete={finish} />
          </PreloaderBoundary>
        )}
      </div>

      <div className="preloader__fallback-mark" aria-hidden="true">PRĀŅA</div>

      <div className="preloader__hud" aria-hidden="true">
        <div className="preloader__hud-block preloader__hud-block--left">
          <b>PRĀŅA / SYSTEMS</b>
          <span>HIGH ALTITUDE INITIALIZATION</span>
        </div>
        <div className="preloader__hud-block preloader__hud-block--right">
          <span>LADAKH / NIGHT</span>
          <span>SNOWFIELD / ACTIVE</span>
          <span>SYSTEM / INITIALIZING</span>
        </div>
        <div className="preloader__hud-foot">
          <span>ENGINEERED FOR EXTREMES</span>
          <i />
          <span>TERRAIN · SYSTEM · SURVIVAL</span>
        </div>
      </div>
    </div>
  );
}
