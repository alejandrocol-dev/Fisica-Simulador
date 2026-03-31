import { useRef, useCallback, useState, useEffect } from 'react';
import { useSimulationLoop } from '../../hooks/useSimulationLoop';
import { useCanvasInteraction } from '../../hooks/useCanvasInteraction';
import EditableSlider from '../../components/EditableSlider';
import {
  stepSimulation, computeState, getAnalyticalPeriod, getAngularFrequency,
  OSCILLATION_PRESETS, type OscillationParams, type OscillationState,
} from './physics-engine';
import { renderOscillation, resetTrail } from './renderer';
import { drawChart, type ChartSeries, type ChartConfig } from '../../utils/chart-renderer';

const DT = 1 / 120;
const MAX_CHART_POINTS = 600;

export default function OscillationsPage() {
  const [params, setParams] = useState<OscillationParams>({
    mass: 1, springK: 10, damping: 0.5, amplitude: 0.5, gravity: 9.81,
  });
  const [speed, setSpeed] = useState(1);
  const [activePreset, setActivePreset] = useState<number | null>(null);
  const [hoverT, setHoverT] = useState<number | null>(null);

  const simCanvasRef = useRef<HTMLCanvasElement>(null);
  const chartXtRef = useRef<HTMLCanvasElement>(null);
  const chartVtRef = useRef<HTMLCanvasElement>(null);
  const chartPhaseRef = useRef<HTMLCanvasElement>(null);
  const chartEnergyRef = useRef<HTMLCanvasElement>(null);

  const stateVecRef = useRef<number[]>([params.amplitude, 0]);
  const historyRef = useRef<{
    x: { x: number; y: number }[]; v: { x: number; y: number }[];
    phase: { x: number; y: number }[]; ke: { x: number; y: number }[];
    pe: { x: number; y: number }[]; te: { x: number; y: number }[];
  }>({ x: [], v: [], phase: [], ke: [], pe: [], te: [] });

  const currentStateRef = useRef<OscillationState>({
    position: params.amplitude, velocity: 0, acceleration: 0,
    time: 0, kineticEnergy: 0, potentialEnergy: 0, totalEnergy: 0,
  });
  const [displayState, setDisplayState] = useState<OscillationState>(currentStateRef.current);
  const transformRef = useRef({ panX: 0, panY: 0, zoom: 1 });

  const onStep = useCallback((time: number, dt: number) => {
    stateVecRef.current = stepSimulation(stateVecRef.current, time, dt, params);
    const s = computeState(stateVecRef.current, time + dt, params);
    currentStateRef.current = s;
    const h = historyRef.current;
    h.x.push({ x: s.time, y: s.position }); h.v.push({ x: s.time, y: s.velocity });
    h.phase.push({ x: s.position, y: s.velocity });
    h.ke.push({ x: s.time, y: s.kineticEnergy }); h.pe.push({ x: s.time, y: s.potentialEnergy });
    h.te.push({ x: s.time, y: s.totalEnergy });
    for (const key of Object.keys(h) as (keyof typeof h)[]) {
      if (h[key].length > MAX_CHART_POINTS) h[key].shift();
    }
  }, [params]);

  const onRender = useCallback(() => {
    const s = currentStateRef.current;
    setDisplayState({ ...s });
    const simCanvas = simCanvasRef.current;
    const h = historyRef.current;
    if (simCanvas) {
      const ctx = simCanvas.getContext('2d');
      if (ctx) renderOscillation(ctx, simCanvas, s, params, h, transformRef.current, hoverT);
    }
    
    // For x(t), v(t), and Energy charts, x-axis is Time. For Phase, x-axis is Position.
    let hoverX_Phase = undefined;
    if (hoverT !== null && h.phase.length > 0) {
      let closestIdx = 0;
      let minDist = Infinity;
      for (let i = 0; i < h.x.length; i++) {
        const d = Math.abs(h.x[i].x - hoverT);
        if (d < minDist) {
          minDist = d;
          closestIdx = i;
        }
      }
      if (h.phase[closestIdx]) hoverX_Phase = h.phase[closestIdx].x;
    }

    const c1 = chartXtRef.current;
    if (c1) { const ctx = c1.getContext('2d'); if (ctx) drawChart(ctx, c1, [{ label: 'x(t)', color: '#00e676', data: h.x }], { xLabel: 't', yLabel: 'x', xUnit: 's', yUnit: 'm', showDot: true, hoverX: hoverT ?? undefined }); }
    const c2 = chartVtRef.current;
    if (c2) { const ctx = c2.getContext('2d'); if (ctx) drawChart(ctx, c2, [{ label: 'v(t)', color: '#ff5252', data: h.v }], { xLabel: 't', yLabel: 'v', xUnit: 's', yUnit: 'm/s', showDot: true, hoverX: hoverT ?? undefined }); }
    const c3 = chartPhaseRef.current;
    if (c3) { const ctx = c3.getContext('2d'); if (ctx) drawChart(ctx, c3, [{ label: 'Fase', color: '#e040fb', data: h.phase }], { xLabel: 'x', yLabel: 'v', xUnit: 'm', yUnit: 'm/s', showDot: true, hoverX: hoverX_Phase }); }
    const c4 = chartEnergyRef.current;
    if (c4) { const ctx = c4.getContext('2d'); if (ctx) drawChart(ctx, c4, [
      { label: 'Ec', color: '#ff5252', data: h.ke, lineWidth: 1.5 },
      { label: 'Ep', color: '#00e676', data: h.pe, lineWidth: 1.5 },
      { label: 'Et', color: '#ffd740', data: h.te, lineWidth: 2 },
    ], { xLabel: 't', yLabel: 'E', xUnit: 's', yUnit: 'J', showDot: true, yMin: 0, hoverX: hoverT ?? undefined }); }
  }, [params, transformRef, hoverT]);

  const { resetView, zoomIn, zoomOut, zoomLevel } = useCanvasInteraction(simCanvasRef, onRender, transformRef);

  const { isRunning, simTime, toggle, reset, pause, setTime } = useSimulationLoop({ dt: DT, speed, onStep, onRender });

  const handleTimeScrub = useCallback((newTime: number) => {
    pause();
    stateVecRef.current = [params.amplitude, 0];
    historyRef.current = { x: [], v: [], phase: [], ke: [], pe: [], te: [] };
    resetTrail();
    
    let t = 0;
    while (t < newTime) {
      onStep(t, DT);
      t += DT;
    }
    
    setTime(t);
    onRender();
  }, [params, pause, onStep, setTime, onRender]);

  useEffect(() => {
    if (!isRunning) onRender();
  }, [hoverT, isRunning, onRender, zoomLevel]);

  const handleChartMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>, isPhaseAxis: boolean) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const PADDING_LEFT = 52;
    const PADDING_RIGHT = 16;
    const plotW = canvas.clientWidth - PADDING_LEFT - PADDING_RIGHT;
    const normX = (mouseX - PADDING_LEFT) / plotW;

    if (normX < -0.05 || normX > 1.05) {
      setHoverT(null);
      return;
    }
    const clampedNormX = Math.max(0, Math.min(1, normX));

    const h = historyRef.current;
    if (h.x.length === 0) return;

    if (!isPhaseAxis) {
      const tMin = h.x[0].x;
      const tMax = h.x[h.x.length - 1].x;
      setHoverT(tMin + clampedNormX * (tMax - tMin));
    } else {
      const pMin = Math.min(...h.phase.map(p => p.x));
      const pMax = Math.max(...h.phase.map(p => p.x));
      const targetPos = pMin + clampedNormX * (pMax - pMin);
      let closestIdx = 0;
      let minDist = Infinity;
      for (let i = 0; i < h.phase.length; i++) {
        const d = Math.abs(h.phase[i].x - targetPos);
        if (d < minDist) {
          minDist = d;
          closestIdx = i;
        }
      }
      setHoverT(h.x[closestIdx].x);
    }
  }, []);

  const handleChartMouseLeave = useCallback(() => setHoverT(null), []);

  const handleReset = useCallback(() => {
    reset();
    setTime(0);
    stateVecRef.current = [params.amplitude, 0];
    historyRef.current = { x: [], v: [], phase: [], ke: [], pe: [], te: [] };
    resetTrail();
    const s = computeState(stateVecRef.current, 0, params);
    currentStateRef.current = s;
    setDisplayState(s);
    const simCanvas = simCanvasRef.current;
    if (simCanvas) { const ctx = simCanvas.getContext('2d'); if (ctx) renderOscillation(ctx, simCanvas, s, params, historyRef.current, transformRef.current, null); }
  }, [reset, setTime, params, transformRef]);

  const applyPreset = (index: number) => {
    const p = OSCILLATION_PRESETS[index].params;
    setParams(prev => ({ ...prev, ...p }));
    setActivePreset(index);
  };

  const prevParamsStr = useRef(JSON.stringify(params));
  useEffect(() => {
    const currentParamsStr = JSON.stringify(params);
    if (prevParamsStr.current !== currentParamsStr) {
      prevParamsStr.current = currentParamsStr;
      handleReset();
    } else if (!isRunning) {
      const s = currentStateRef.current;
      const simCanvas = simCanvasRef.current;
      const h = historyRef.current;
      if (simCanvas) { const ctx = simCanvas.getContext('2d'); if (ctx) renderOscillation(ctx, simCanvas, s, params, h, transformRef.current, hoverT); }
    }
  }, [params, isRunning, transformRef, handleReset, zoomLevel, hoverT]);

  // Space key for instant pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target === document.body || e.target === document.documentElement)) {
        e.preventDefault(); toggle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  const period = getAnalyticalPeriod(params);
  const omega = getAngularFrequency(params);

  return (
    <div className="sim-layout">
      {/* LEFT PANEL */}
      <div className="glass sim-panel animate-slide-in-left">
        <div className="sim-controls">
          <button className={`btn-control ${isRunning ? 'active' : ''}`} onClick={toggle} title={isRunning ? 'Pausar (Space)' : 'Play (Space)'}>
            {isRunning ? '⏸' : '▶'}
          </button>
          <button className="btn-control" onClick={handleReset} title="Reiniciar">↺</button>
          <div className="sim-time">t = {simTime.toFixed(2)}s</div>
        </div>

        <div className="sim-panel-section">
          <div className="sim-panel-title">Control de Ejecución</div>
          <EditableSlider label="Velocidad Sim." value={speed} min={0.1} max={5} step={0.1} unit="x" onChange={setSpeed} decimals={1} />
        </div>
        
        <div className="sim-panel-section">
          <div className="sim-panel-title">Tiempo Manual</div>
          <EditableSlider label="Tiempo (t)" value={simTime} min={0} max={period * 4 || 20} step={0.05} unit="s" onChange={handleTimeScrub} decimals={2} />
        </div>

        <div className="sim-panel-section">
          <div className="sim-panel-title">Parámetros</div>
          <EditableSlider label="Masa (m)" value={params.mass} min={0.1} max={10} step={0.1} unit="kg" onChange={v => setParams(p => ({ ...p, mass: v }))} decimals={1} />
          <EditableSlider label="Constante k" value={params.springK} min={0.5} max={100} step={0.5} unit="N/m" onChange={v => setParams(p => ({ ...p, springK: v }))} decimals={1} />
          <EditableSlider label="Amortiguamiento (b)" value={params.damping} min={0} max={15} step={0.01} unit="" onChange={v => setParams(p => ({ ...p, damping: v }))} />
          <EditableSlider label="Amplitud (A₀)" value={params.amplitude} min={0.05} max={1.5} step={0.01} unit="m" onChange={v => setParams(p => ({ ...p, amplitude: v }))} />
        </div>

        <div className="sim-panel-section">
          <div className="sim-panel-title">Valores Analíticos</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <div className="value-display" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '8px 12px' }}>
              <span className="value-name" style={{ fontSize: '0.7rem', opacity: 0.7 }}>Período T (teórico)</span>
              <div><span className="value-number">{period.toFixed(3)}</span><span className="value-unit">s</span></div>
            </div>
            <div className="value-display" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '8px 12px' }}>
              <span className="value-name" style={{ fontSize: '0.7rem', opacity: 0.7 }}>Frecuencia (f)</span>
              <div><span className="value-number">{(1 / period).toFixed(3)}</span><span className="value-unit">Hz</span></div>
            </div>
            <div className="value-display" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '8px 12px', gridColumn: '1 / -1' }}>
              <span className="value-name" style={{ fontSize: '0.7rem', opacity: 0.7 }}>Frecuencia angular (ω)</span>
              <div><span className="value-number">{omega.toFixed(3)}</span><span className="value-unit">rad/s</span></div>
            </div>
          </div>
        </div>

        <div className="sim-panel-section">
          <div className="sim-panel-title">Escenarios</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {OSCILLATION_PRESETS.map((preset, i) => (
              <button key={i} className={`preset-btn ${activePreset === i ? 'active' : ''}`} onClick={() => applyPreset(i)}>
                <span>{preset.icon}</span><span>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="sim-panel-section">
          <div className="sim-panel-title">Ecuación</div>
          <div className="theory-equation">m·x'' + b·x' + k·x = 0</div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>
            Ecuación diferencial del oscilador armónico amortiguado.
          </p>
        </div>
      </div>

      {/* CENTER CANVAS */}
      <div className="sim-canvas-container animate-fade-in">
        <canvas ref={simCanvasRef} style={{ width: '100%', height: '100%' }} />
        <div className="canvas-controls">
          <button className="canvas-ctrl-btn" onClick={zoomIn} title="Zoom in">+</button>
          <span className="canvas-zoom-label">{Math.round(zoomLevel * 100)}%</span>
          <button className="canvas-ctrl-btn" onClick={zoomOut} title="Zoom out">−</button>
          <button className="canvas-ctrl-btn" onClick={resetView} title="Reset vista">⟲</button>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="glass sim-panel animate-fade-in" style={{ animationDelay: '100ms' }}>
        <div className="sim-panel-section">
          <div className="sim-panel-title">Estado Actual</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="value-display"><div className="value-dot" style={{ background: '#00e676' }} /><span className="value-name">Posición</span><span className="value-number">{displayState.position.toFixed(4)}</span><span className="value-unit">m</span></div>
            <div className="value-display"><div className="value-dot" style={{ background: '#ff5252' }} /><span className="value-name">Velocidad</span><span className="value-number">{displayState.velocity.toFixed(4)}</span><span className="value-unit">m/s</span></div>
            <div className="value-display"><div className="value-dot" style={{ background: '#448aff' }} /><span className="value-name">Aceleración</span><span className="value-number">{displayState.acceleration.toFixed(4)}</span><span className="value-unit">m/s²</span></div>
          </div>
        </div>

        <div className="sim-panel-section">
          <div className="sim-panel-title">Energía</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="value-display"><div className="value-dot" style={{ background: '#ff5252' }} /><span className="value-name">Cinética</span><span className="value-number">{displayState.kineticEnergy.toFixed(4)}</span><span className="value-unit">J</span></div>
            <div className="value-display"><div className="value-dot" style={{ background: '#00e676' }} /><span className="value-name">Potencial</span><span className="value-number">{displayState.potentialEnergy.toFixed(4)}</span><span className="value-unit">J</span></div>
            <div className="value-display"><div className="value-dot" style={{ background: '#ffd740' }} /><span className="value-name">Total</span><span className="value-number">{displayState.totalEnergy.toFixed(4)}</span><span className="value-unit">J</span></div>
          </div>
        </div>

        <div className="chart-container"><div className="chart-title"><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00e676' }} />Posición x(t)</div><canvas ref={chartXtRef} className="chart-canvas" style={{ height: 130 }} onMouseMove={(e) => handleChartMouseMove(e, false)} onMouseLeave={handleChartMouseLeave} /></div>
        <div className="chart-container"><div className="chart-title"><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5252' }} />Velocidad v(t)</div><canvas ref={chartVtRef} className="chart-canvas" style={{ height: 130 }} onMouseMove={(e) => handleChartMouseMove(e, false)} onMouseLeave={handleChartMouseLeave} /></div>
        <div className="chart-container"><div className="chart-title"><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#e040fb' }} />Diagrama de Fase</div><canvas ref={chartPhaseRef} className="chart-canvas" style={{ height: 130 }} onMouseMove={(e) => handleChartMouseMove(e, true)} onMouseLeave={handleChartMouseLeave} /></div>
        <div className="chart-container"><div className="chart-title"><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ffd740' }} />Energía</div><canvas ref={chartEnergyRef} className="chart-canvas" style={{ height: 130 }} onMouseMove={(e) => handleChartMouseMove(e, false)} onMouseLeave={handleChartMouseLeave} /></div>
      </div>
    </div>
  );
}
