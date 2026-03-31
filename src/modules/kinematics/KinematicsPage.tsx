import { useRef, useCallback, useState, useEffect } from 'react';
import { useSimulationLoop } from '../../hooks/useSimulationLoop';
import { useCanvasInteraction } from '../../hooks/useCanvasInteraction';
import EditableSlider from '../../components/EditableSlider';
import {
  stepKinematics, getInitialState, computeKinematicsState,
  getAnalyticalRange, getAnalyticalMaxHeight, getAnalyticalTimeOfFlight,
  KINEMATICS_PRESETS, type KinematicsParams, type KinematicsState,
} from './physics-engine';
import { renderKinematics, resetKinematicsTrail } from './renderer';
import { drawChart, type ChartSeries } from '../../utils/chart-renderer';

const DT = 1 / 120;
const MAX_CHART_POINTS = 800;

export default function KinematicsPage() {
  const [params, setParams] = useState<KinematicsParams>({
    initialSpeed: 20, launchAngle: 45, gravity: 9.81, airResistance: 0, height: 0, targetHeight: 0,
  });
  const [speed, setSpeed] = useState(1);
  const [activePreset, setActivePreset] = useState<number | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [hoverT, setHoverT] = useState<number | null>(null);

  // Opciones de visualización
  const [showGrid, setShowGrid] = useState(true);
  const [showVectors, setShowVectors] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  const simCanvasRef = useRef<HTMLCanvasElement>(null);
  const chartXYRef = useRef<HTMLCanvasElement>(null);
  const chartXtRef = useRef<HTMLCanvasElement>(null);
  const chartVtRef = useRef<HTMLCanvasElement>(null);

  const stateVecRef = useRef<number[]>(getInitialState(params));
  const maxHeightRef = useRef(0);
  const timeAtMaxHeightRef = useRef(0);
  const maxRangeRef = useRef(0);
  const pauseRef = useRef<() => void>(() => {});
  const historyRef = useRef<{
    xy: { x: number; y: number; t: number }[]; xt: { x: number; y: number }[];
    yt: { x: number; y: number }[]; vxt: { x: number; y: number }[];
    vyt: { x: number; y: number }[]; speedt: { x: number; y: number }[];
  }>({ xy: [], xt: [], yt: [], vxt: [], vyt: [], speedt: [] });

  const currentStateRef = useRef<KinematicsState>({
    x: 0, y: params.height, vx: 0, vy: 0, speed: params.initialSpeed,
    time: 0, maxHeight: params.height, timeAtMaxHeight: 0, range: 0, hasLanded: false,
  });
  const [displayState, setDisplayState] = useState<KinematicsState>(currentStateRef.current);
  const transformRef = useRef({ panX: 0, panY: 0, zoom: 1 });

  const onStep = useCallback((time: number, dt: number) => {
    if (currentStateRef.current.hasLanded) return;
    stateVecRef.current = stepKinematics(stateVecRef.current, time, dt, params);
    const sv = stateVecRef.current;
    
    if (sv[1] > maxHeightRef.current) {
      maxHeightRef.current = sv[1];
      timeAtMaxHeightRef.current = time + dt;
    }

    const targetH = params.targetHeight || 0;
    if (sv[1] <= targetH + 0.01 && time > 0.01) maxRangeRef.current = sv[0];
    const state = computeKinematicsState(sv, time + dt, maxHeightRef.current, timeAtMaxHeightRef.current, maxRangeRef.current, targetH);
    
    if (state.hasLanded && !currentStateRef.current.hasLanded) {
      setTimeout(() => pauseRef.current(), 0); // Pause on next tick to finish current cycle
    }

    currentStateRef.current = state;
    const h = historyRef.current;
    h.xy.push({ x: state.x, y: state.y, t: state.time }); h.xt.push({ x: state.time, y: state.x });
    h.yt.push({ x: state.time, y: state.y }); h.vxt.push({ x: state.time, y: state.vx });
    h.vyt.push({ x: state.time, y: state.vy }); h.speedt.push({ x: state.time, y: state.speed });
    for (const key of Object.keys(h) as (keyof typeof h)[]) {
      if (h[key].length > MAX_CHART_POINTS) h[key].shift();
    }
  }, [params]);

  const onRender = useCallback(() => {
    const s = currentStateRef.current;
    setDisplayState({ ...s });
    const simCanvas = simCanvasRef.current;
    if (!simCanvas) return;
    const h = historyRef.current;

    // Follow particle logic: update pan AND zoom BEFORE rendering
    if (isFollowing) {
      const w = simCanvas.clientWidth;
      const h = simCanvas.clientHeight;
      
      // Force a high zoom level for "premium" close-up experience
      const targetZoom = 2.5;
      transformRef.current.zoom = targetZoom;

      // Use EXACTLY the same static scaling logic as the renderer
      const maxX = 120;
      const maxY = Math.max(60, params.height * 1.2, (params.targetHeight || 0) * 1.2);

      const padding = 60;
      const groundY = h - 60;
      const plotW = w - padding * 2;
      const plotH = groundY - padding;
      
      const scaleX = plotW / maxX;
      const scaleY = plotH / maxY;
      
      const projX = padding + s.x * scaleX;
      const projY = groundY - s.y * scaleY;

      transformRef.current.panX = w / 2 - projX * targetZoom;
      transformRef.current.panY = h / 2 - projY * targetZoom;
    }

    const ctx = simCanvas.getContext('2d');
    if (ctx) renderKinematics(ctx, simCanvas, s, params, h.xy, transformRef.current, hoverT, { showGrid, showVectors, showLabels });

    const hx = hoverT;
    const c1 = chartXYRef.current;
    if (c1) { 
      const ctx = c1.getContext('2d'); 
      if (ctx) {
        // For XY chart, hoverX should be the X coordinate corresponding to hoverT
        let hoverX: number | null = null;
        if (hx !== null && h.xt.length > 0) {
          const idx = h.xt.findIndex(p => p.x >= hx);
          if (idx !== -1) hoverX = h.xy[idx].x;
        }
        drawChart(ctx, c1, [{ label: 'y(x)', color: '#ff5252', data: h.xy }], { xLabel: 'x', yLabel: 'y', xUnit: 'm', yUnit: 'm', showDot: true, yMin: 0, hoverX }); 
      }
    }

    const c2 = chartXtRef.current;
    if (c2) { 
      const ctx = c2.getContext('2d'); 
      if (ctx) {
        const series: ChartSeries[] = [ { label: 'x(t)', color: '#00e676', data: h.xt, lineWidth: 1.5 }, { label: 'y(t)', color: '#448aff', data: h.yt, lineWidth: 1.5 } ];
        drawChart(ctx, c2, series, { xLabel: 't', yLabel: 'pos', xUnit: 's', yUnit: 'm', showDot: true, hoverX: hx });
      }
    }

    const c3 = chartVtRef.current;
    if (c3) { 
      const ctx = c3.getContext('2d'); 
      if (ctx) {
        const series: ChartSeries[] = [ 
          { label: 'vx', color: '#ff5252', data: h.vxt, lineWidth: 1.5 }, 
          { label: 'vy', color: '#448aff', data: h.vyt, lineWidth: 1.5 }, 
          { label: '|v|', color: '#ffd740', data: h.speedt, lineWidth: 2 } 
        ];
        drawChart(ctx, c3, series, { xLabel: 't', yLabel: 'v', xUnit: 's', yUnit: 'm/s', showDot: true, hoverX: hx });
      }
    }
  }, [params, transformRef, isFollowing, hoverT, showGrid, showVectors, showLabels]);

  const { resetView, zoomIn, zoomOut, zoomLevel } = useCanvasInteraction(simCanvasRef, onRender, transformRef);

  const { isRunning, simTime, toggle, reset, pause, setTime } = useSimulationLoop({ dt: DT, speed, onStep, onRender });
  pauseRef.current = pause;

  const handleReset = useCallback(() => {
    reset();
    setTime(0);
    stateVecRef.current = getInitialState(params);
    maxHeightRef.current = 0;
    timeAtMaxHeightRef.current = 0;
    maxRangeRef.current = 0;
    historyRef.current = { xy: [], xt: [], yt: [], vxt: [], vyt: [], speedt: [] };
    const s = {
      x: 0, y: params.height, vx: 0, vy: 0, speed: params.initialSpeed,
      time: 0, maxHeight: params.height, timeAtMaxHeight: 0, range: 0, hasLanded: false,
    };
    currentStateRef.current = s;
    resetKinematicsTrail();
    setDisplayState(s);
    onRender();
  }, [reset, setTime, params, onRender]);

  const handleTimeScrub = useCallback((newTime: number) => {
    pause();
    stateVecRef.current = getInitialState(params);
    maxHeightRef.current = 0;
    timeAtMaxHeightRef.current = 0;
    maxRangeRef.current = 0;
    historyRef.current = { xy: [], xt: [], yt: [], vxt: [], vyt: [], speedt: [] };
    currentStateRef.current = {
      x: 0, y: params.height, vx: 0, vy: 0, speed: params.initialSpeed,
      time: 0, maxHeight: params.height, timeAtMaxHeight: 0, range: 0, hasLanded: false,
    };
    resetKinematicsTrail();
    
    let t = 0;
    while (t < newTime && !currentStateRef.current.hasLanded) {
      onStep(t, DT);
      t += DT;
    }
    
    setTime(t);
    onRender();
  }, [params, pause, onStep, setTime, onRender]);

  useEffect(() => {
    if (!isRunning) {
      onRender();
    }
  }, [hoverT, isRunning, onRender, zoomLevel]);

  const handleChartMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>, isTimeAxis: boolean) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const PADDING_LEFT = 52;
    const PADDING_RIGHT = 16;
    const plotW = canvas.clientWidth - PADDING_LEFT - PADDING_RIGHT;
    const normX = (mouseX - PADDING_LEFT) / plotW;

    // Tolerance bound for edge hovering
    if (normX < -0.05 || normX > 1.05) {
      setHoverT(null);
      return;
    }
    const clampedNormX = Math.max(0, Math.min(1, normX));

    const h = historyRef.current;
    if (h.xt.length === 0) return;

    if (isTimeAxis) {
      const tMin = h.xt[0].x;
      const tMax = h.xt[h.xt.length - 1].x;
      setHoverT(tMin + clampedNormX * (tMax - tMin));
    } else {
      const xMin = h.xy[0].x;
      const xMax = h.xy[h.xy.length - 1].x;
      const targetX = xMin + clampedNormX * (xMax - xMin);
      let closestIdx = 0;
      let minDist = Infinity;
      for (let i = 0; i < h.xy.length; i++) {
        const d = Math.abs(h.xy[i].x - targetX);
        if (d < minDist) {
          minDist = d;
          closestIdx = i;
        }
      }
      setHoverT(h.xt[closestIdx].x);
    }
  }, []);

  const handleChartMouseLeave = useCallback(() => setHoverT(null), []);

  const applyPreset = (index: number) => {
    setParams(prev => ({ ...prev, ...KINEMATICS_PRESETS[index].params }));
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
      if (simCanvas) { const ctx = simCanvas.getContext('2d'); if (ctx) renderKinematics(ctx, simCanvas, s, params, historyRef.current.xy, transformRef.current); }
    }
  }, [params, isRunning, transformRef, handleReset, zoomLevel]);

  // Space key instant pause/play
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target === document.body || e.target === document.documentElement)) {
        e.preventDefault(); toggle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  const analyticalRange = getAnalyticalRange(params);
  const analyticalMaxH = getAnalyticalMaxHeight(params);
  const timeOfFlight = getAnalyticalTimeOfFlight(params);
  
  // Angle calculations
  const angleRad = (params.launchAngle * Math.PI) / 180;
  const v0x = params.initialSpeed * Math.cos(angleRad);
  const v0y = params.initialSpeed * Math.sin(angleRad);
  const timeToMaxH = v0y / params.gravity;
  const finalVy = v0y - params.gravity * timeOfFlight;
  const impactAngle = Math.atan2(finalVy, v0x) * (180 / Math.PI);

  return (
    <div className="sim-layout">
      {/* LEFT PANEL */}
      <div className="glass sim-panel animate-slide-in-left">
        <div className="sim-controls">
          <button className={`btn-control ${isRunning ? 'active' : ''}`} onClick={toggle}>
            {isRunning ? '⏸' : '▶'}
          </button>
          <button className="btn-control" onClick={handleReset}>↺</button>
          <div className="sim-time">t = {simTime.toFixed(2)}s</div>
        </div>

        <div className="sim-panel-section">
          <div className="sim-panel-title">Control de Ejecución</div>
          <EditableSlider label="Velocidad Sim." value={speed} min={0.1} max={5} step={0.1} unit="x" onChange={setSpeed} decimals={1} />
        </div>
        
        <div className="sim-panel-section">
          <div className="sim-panel-title">Tiempo Manual</div>
          <EditableSlider label="Tiempo (t)" value={simTime} min={0} max={timeOfFlight || 10} step={0.05} unit="s" onChange={handleTimeScrub} decimals={2} />
        </div>

        <div className="sim-panel-section">
          <div className="sim-panel-title">Parámetros</div>
          <EditableSlider label="Velocidad inicial (v₀)" value={params.initialSpeed} min={1} max={60} step={0.5} unit="m/s" onChange={v => setParams(p => ({ ...p, initialSpeed: v }))} decimals={1} />
          <EditableSlider label="Ángulo (θ)" value={params.launchAngle} min={0} max={90} step={1} unit="°" onChange={v => setParams(p => ({ ...p, launchAngle: v }))} decimals={0} />
          <EditableSlider label="Gravedad (g)" value={params.gravity} min={0.5} max={25} step={0.01} unit="m/s²" onChange={v => setParams(p => ({ ...p, gravity: v }))} />
          <EditableSlider label="Altura inicial (h₀)" value={params.height} min={0} max={100} step={0.5} unit="m" onChange={v => setParams(p => ({ ...p, height: v }))} decimals={1} />
          <EditableSlider label="Altura final / Suelo" value={params.targetHeight || 0} min={0} max={100} step={0.5} unit="m" onChange={v => setParams(p => ({ ...p, targetHeight: v }))} decimals={1} />
          <EditableSlider label="Resistencia del aire" value={params.airResistance} min={0} max={0.1} step={0.001} unit="" onChange={v => setParams(p => ({ ...p, airResistance: v }))} decimals={3} />
        </div>

        <div className="sim-panel-section">
          <div className="sim-panel-title">Escenarios</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {KINEMATICS_PRESETS.map((preset, i) => (
              <button key={i} className={`preset-btn ${activePreset === i ? 'active' : ''}`} onClick={() => applyPreset(i)}>
                <span>{preset.icon}</span><span>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="sim-panel-section">
          <div className="sim-panel-title">Ecuaciones</div>
          <div className="theory-equation">x(t) = v₀·cos(θ)·t</div>
          <div className="theory-equation">y(t) = h₀ + v₀·sin(θ)·t − ½g·t²</div>
        </div>
      </div>

      {/* CENTER CANVAS */}
      <div className="sim-canvas-container animate-fade-in">
        <canvas ref={simCanvasRef} style={{ width: '100%', height: '100%' }} />
        <div className="canvas-controls">
          <button 
            className={`canvas-ctrl-btn follow-btn ${isFollowing ? 'active' : ''}`} 
            onClick={() => setIsFollowing(!isFollowing)}
            title={isFollowing ? "Desactivar seguimiento" : "Modo Seguimiento (Primer plano)"}
          >
            {isFollowing ? '👁️' : '👁️'} {isFollowing ? 'Siguiendo' : 'Seguimiento'}
          </button>
          <div className="canvas-ctrl-divider" />
          <button className={`canvas-ctrl-btn ${showGrid ? 'active' : ''}`} onClick={() => setShowGrid(!showGrid)} title={showGrid ? "Ocultar cuadrícula" : "Mostrar cuadrícula"}>
            #️⃣
          </button>
          <button className={`canvas-ctrl-btn ${showVectors ? 'active' : ''}`} onClick={() => setShowVectors(!showVectors)} title={showVectors ? "Ocultar vectores" : "Mostrar vectores"}>
            ↗️
          </button>
          <button className={`canvas-ctrl-btn ${showLabels ? 'active' : ''}`} onClick={() => setShowLabels(!showLabels)} title={showLabels ? "Ocultar información" : "Mostrar información"}>
            📝
          </button>
          <div className="canvas-ctrl-divider" />
          <button className="canvas-ctrl-btn" onClick={zoomIn} title="Zoom in">+</button>
          <span className="canvas-zoom-label">
            {isFollowing ? '250%' : `${Math.round(zoomLevel * 100)}%`}
          </span>
          <button className="canvas-ctrl-btn" onClick={zoomOut} title="Zoom out">−</button>
          <button className="canvas-ctrl-btn" onClick={resetView} title="Reset vista">⟲</button>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="glass sim-panel animate-fade-in" style={{ animationDelay: '100ms' }}>
        <div className="sim-panel-section">
          <div className="sim-panel-title">Estado Actual</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="value-display"><div className="value-dot" style={{ background: '#00e676' }} /><span className="value-name">x</span><span className="value-number">{displayState.x.toFixed(2)}</span><span className="value-unit">m</span></div>
            <div className="value-display"><div className="value-dot" style={{ background: '#448aff' }} /><span className="value-name">y</span><span className="value-number">{displayState.y.toFixed(2)}</span><span className="value-unit">m</span></div>
            <div className="value-display"><div className="value-dot" style={{ background: '#ff5252' }} /><span className="value-name">vx</span><span className="value-number">{displayState.vx.toFixed(2)}</span><span className="value-unit">m/s</span></div>
            <div className="value-display"><div className="value-dot" style={{ background: '#448aff' }} /><span className="value-name">vy</span><span className="value-number">{displayState.vy.toFixed(2)}</span><span className="value-unit">m/s</span></div>
            <div className="value-display"><div className="value-dot" style={{ background: '#ffd740' }} /><span className="value-name">|v|</span><span className="value-number">{displayState.speed.toFixed(2)}</span><span className="value-unit">m/s</span></div>
          </div>
        </div>

        <div className="sim-panel-section">
          <div className="sim-panel-title">Valores Analíticos</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <div className="value-display" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '8px 12px' }}>
              <span className="value-name" style={{ fontSize: '0.7rem', opacity: 0.7 }}>Alcance (teórico)</span>
              <div><span className="value-number">{analyticalRange.toFixed(2)}</span><span className="value-unit">m</span></div>
            </div>
            <div className="value-display" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '8px 12px' }}>
              <span className="value-name" style={{ fontSize: '0.7rem', opacity: 0.7 }}>Altura máx (teórica)</span>
              <div><span className="value-number">{analyticalMaxH.toFixed(2)}</span><span className="value-unit">m</span></div>
            </div>
            <div className="value-display" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '8px 12px' }}>
              <span className="value-name" style={{ fontSize: '0.7rem', opacity: 0.7 }}>Tiempo Vuelo (teórico)</span>
              <div><span className="value-number">{timeOfFlight.toFixed(2)}</span><span className="value-unit">s</span></div>
            </div>
            <div className="value-display" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '8px 12px' }}>
              <span className="value-name" style={{ fontSize: '0.7rem', opacity: 0.7 }}>t Altura máx</span>
              <div><span className="value-number">{timeToMaxH > 0 && Number.isFinite(timeToMaxH) ? timeToMaxH.toFixed(2) : "0.00"}</span><span className="value-unit">s</span></div>
            </div>
            <div className="value-display" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '8px 12px', gridColumn: '1 / -1' }}>
              <span className="value-name" style={{ fontSize: '0.7rem', opacity: 0.7 }}>Ángulo de Impacto</span>
              <div><span className="value-number">{impactAngle ? impactAngle.toFixed(1) : "0.0"}</span><span className="value-unit">°</span></div>
            </div>
          </div>
        </div>

        <div className="chart-container">
          <div className="chart-title"><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5252' }} />Trayectoria y(x)</div>
          <canvas 
            ref={chartXYRef} 
            className="chart-canvas" 
            style={{ height: 150 }} 
            onMouseMove={(e) => handleChartMouseMove(e, false)}
            onMouseLeave={handleChartMouseLeave}
          />
        </div>
        <div className="chart-container">
          <div className="chart-title"><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00e676' }} />Posición x(t), y(t)</div>
          <canvas 
            ref={chartXtRef} 
            className="chart-canvas" 
            style={{ height: 150 }} 
            onMouseMove={(e) => handleChartMouseMove(e, true)}
            onMouseLeave={handleChartMouseLeave}
          />
        </div>
        <div className="chart-container">
          <div className="chart-title"><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ffd740' }} />Velocidad vx(t), vy(t), |v|(t)</div>
          <canvas 
            ref={chartVtRef} 
            className="chart-canvas" 
            style={{ height: 150 }} 
            onMouseMove={(e) => handleChartMouseMove(e, true)}
            onMouseLeave={handleChartMouseLeave}
          />
        </div>
      </div>
    </div>
  );
}
