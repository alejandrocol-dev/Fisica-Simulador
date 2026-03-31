import { useRef, useCallback, useState, useEffect } from 'react';
import { useSimulationLoop } from '../../hooks/useSimulationLoop';
import { useCanvasInteraction } from '../../hooks/useCanvasInteraction';
import EditableSlider from '../../components/EditableSlider';
import { drawChart } from '../../utils/chart-renderer';
import {
  computeState1D, KINEMATICS_1D_PRESETS,
  type Kinematics1DParams, type Kinematics1DState
} from './physics-engine';
import { renderKinematics1D } from './renderer';

const DT = 1 / 60;
const MAX_CHART_POINTS = 600;

export default function Kinematics1DPage() {
  const [params, setParams] = useState<Kinematics1DParams>({
    x0: -10, v0: 5, a: 1,
    enableBody2: false, x0_2: 10, v0_2: -5, a_2: 0
  });
  const [speed, setSpeed] = useState(1);
  const [activePreset, setActivePreset] = useState<number | null>(null);
  const [hoverT, setHoverT] = useState<number | null>(null);

  // Opciones de visualización
  const [showGrid, setShowGrid] = useState(true);
  const [showVectors, setShowVectors] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  const simCanvasRef = useRef<HTMLCanvasElement>(null);
  const chartXtRef = useRef<HTMLCanvasElement>(null);
  const chartVtRef = useRef<HTMLCanvasElement>(null);
  const chartAtRef = useRef<HTMLCanvasElement>(null);

  const transformRef = useRef({ panX: 0, panY: 0, zoom: 1 });

  const historyRef = useRef<{
    x: { x: number; y: number }[];
    v: { x: number; y: number }[];
    a: { x: number; y: number }[];
    x2: { x: number; y: number }[];
    v2: { x: number; y: number }[];
    a2: { x: number; y: number }[];
  }>({ x: [], v: [], a: [], x2: [], v2: [], a2: [] });
  
  const currentStateRef = useRef<Kinematics1DState>(computeState1D(0, params));
  const [displayState, setDisplayState] = useState<Kinematics1DState>(currentStateRef.current);

  const onStep = useCallback((time: number, dt: number) => {
    const s = computeState1D(time + dt, params);
    currentStateRef.current = s;
    const h = historyRef.current;
    
    h.x.push({ x: s.t, y: s.x });
    h.v.push({ x: s.t, y: s.v });
    h.a.push({ x: s.t, y: s.a });
    if (params.enableBody2) {
      h.x2.push({ x: s.t, y: s.x2 });
      h.v2.push({ x: s.t, y: s.v2 });
      h.a2.push({ x: s.t, y: s.a2 });
    }
    
    const maxP = Math.max(h.x.length, h.v.length, h.a.length, h.x2.length);
    if (maxP > MAX_CHART_POINTS) {
      if (h.x.length > MAX_CHART_POINTS) h.x.shift();
      if (h.v.length > MAX_CHART_POINTS) h.v.shift();
      if (h.a.length > MAX_CHART_POINTS) h.a.shift();
      if (h.x2.length > MAX_CHART_POINTS) h.x2.shift();
      if (h.v2.length > MAX_CHART_POINTS) h.v2.shift();
      if (h.a2.length > MAX_CHART_POINTS) h.a2.shift();
    }
  }, [params]);

  const onRender = useCallback(() => {
    const s = currentStateRef.current;
    setDisplayState({ ...s });
    const simCanvas = simCanvasRef.current;
    if (simCanvas) {
      const ctx = simCanvas.getContext('2d');
      if (ctx) renderKinematics1D(ctx, simCanvas, s, params, historyRef.current, transformRef.current, hoverT, { showGrid, showVectors, showLabels });
    }
    const h = historyRef.current;
    
    const c1 = chartXtRef.current;
    if (c1) { 
      const ctx = c1.getContext('2d'); 
      if (ctx) {
        const data = [{ label: 'x(t)', color: '#6c5ce7', data: h.x }];
        if (params.enableBody2) data.push({ label: 'x₂(t)', color: '#e17055', data: h.x2 });
        drawChart(ctx, c1, data, { xLabel: 't', yLabel: 'x', xUnit: 's', yUnit: 'm', showDot: true, hoverX: hoverT ?? undefined }); 
      }
    }
    const c2 = chartVtRef.current;
    if (c2) { 
      const ctx = c2.getContext('2d'); 
      if (ctx) {
        const data = [{ label: 'v(t)', color: '#ff5252', data: h.v }];
        if (params.enableBody2) data.push({ label: 'v₂(t)', color: '#e17055', data: h.v2 });
        drawChart(ctx, c2, data, { xLabel: 't', yLabel: 'v', xUnit: 's', yUnit: 'm/s', showDot: true, hoverX: hoverT ?? undefined }); 
      }
    }
    const c3 = chartAtRef.current;
    if (c3) { 
      const ctx = c3.getContext('2d'); 
      if (ctx) {
        const data = [{ label: 'a(t)', color: '#00e676', data: h.a }];
        if (params.enableBody2) data.push({ label: 'a₂(t)', color: '#e17055', data: h.a2 });
        drawChart(ctx, c3, data, { xLabel: 't', yLabel: 'a', xUnit: 's', yUnit: 'm/s²', showDot: true, hoverX: hoverT ?? undefined }); 
      }
    }
  }, [params, transformRef, hoverT, showGrid, showVectors, showLabels]);

  const { resetView, zoomIn, zoomOut, zoomLevel } = useCanvasInteraction(simCanvasRef, onRender, transformRef);
  const { isRunning, simTime, toggle, reset, pause, setTime } = useSimulationLoop({ dt: DT, speed, onStep, onRender });

  useEffect(() => {
    if (!isRunning) onRender();
  }, [hoverT, isRunning, onRender]);

  const handleChartMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
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

    const tMin = h.x[0].x;
    const tMax = h.x[h.x.length - 1].x;
    setHoverT(tMin + clampedNormX * (tMax - tMin));
  }, []);

  const handleChartMouseLeave = useCallback(() => setHoverT(null), []);

  const handleReset = useCallback(() => {
    reset();
    historyRef.current = { x: [], v: [], a: [], x2: [], v2: [], a2: [] };
    const s = computeState1D(0, params);
    currentStateRef.current = s;
    setDisplayState(s);
    onRender();
  }, [reset, params, onRender]);

  const prevParamsStr = useRef(JSON.stringify(params));
  useEffect(() => {
    const currentParamsStr = JSON.stringify(params);
    if (prevParamsStr.current !== currentParamsStr) {
      prevParamsStr.current = currentParamsStr;
      handleReset();
    }
  }, [params, handleReset]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target === document.body || e.target === document.documentElement)) {
        e.preventDefault(); toggle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  const applyPreset = (index: number) => {
    const p = KINEMATICS_1D_PRESETS[index].params;
    setParams(prev => ({ ...prev, ...p }));
    setActivePreset(index);
  };

  return (
    <div className="sim-layout">
      {/* LEFT PANEL */}
      <div className="glass sim-panel animate-slide-in-left">
        <div className="sim-controls">
          <button className={`btn-control ${isRunning ? 'active' : ''}`} onClick={toggle} title={isRunning ? 'Pausar (Space)' : 'Play (Space)'}>
            {isRunning ? '⏸' : '▶'}
          </button>
          <button className="btn-control" onClick={handleReset} title="Reiniciar">↺</button>
          <div className="sim-time" style={{ width: 80, marginLeft: 16 }}>t={simTime.toFixed(2)}s</div>
        </div>

        <div className="sim-panel-section">
          <div className="sim-panel-title">Control de Ejecución</div>
          <EditableSlider label="Velocidad Sim." value={speed} min={0.1} max={5} step={0.1} unit="x" onChange={setSpeed} decimals={1} />
        </div>

        <div className="sim-panel-section">
          <div className="sim-panel-title">Tiempo Manual</div>
          <EditableSlider label="Tiempo (t)" value={simTime} min={0} max={20} step={0.05} unit="s" onChange={(val) => {
            pause(); reset(); setTime(val); 
            historyRef.current = { x: [], v: [], a: [], x2: [], v2: [], a2: [] }; 
            const s = computeState1D(val, params); 
            currentStateRef.current = s; setDisplayState(s); onRender();
          }} decimals={2} />
        </div>

        <div className="sim-panel-section">
          <div className="sim-panel-title">Parámetros (Cuerpo 1)</div>
          <EditableSlider label="Posición inicial (x₀)" value={params.x0} min={-100} max={100} step={1} unit="m" onChange={v => setParams(p => ({ ...p, x0: v }))} decimals={1} />
          <EditableSlider label="Velocidad (v₀)" value={params.v0} min={-50} max={50} step={1} unit="m/s" onChange={v => setParams(p => ({ ...p, v0: v }))} decimals={1} />
          <EditableSlider label="Aceleración (a)" value={params.a} min={-20} max={20} step={0.1} unit="m/s²" onChange={v => setParams(p => ({ ...p, a: v }))} decimals={2} />

          <div className="sim-panel-title" style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Cuerpo 2</span>
            <input type="checkbox" checked={params.enableBody2} onChange={e => setParams(p => ({ ...p, enableBody2: e.target.checked }))} />
          </div>
          {params.enableBody2 && (
            <>
              <EditableSlider label="Posición (x₀)" value={params.x0_2} min={-100} max={100} step={1} unit="m" onChange={v => setParams(p => ({ ...p, x0_2: v }))} decimals={1} />
              <EditableSlider label="Velocidad (v₀)" value={params.v0_2} min={-50} max={50} step={1} unit="m/s" onChange={v => setParams(p => ({ ...p, v0_2: v }))} decimals={1} />
              <EditableSlider label="Aceleración (a)" value={params.a_2} min={-20} max={20} step={0.1} unit="m/s²" onChange={v => setParams(p => ({ ...p, a_2: v }))} decimals={2} />
            </>
          )}
        </div>

        <div className="sim-panel-section">
          <div className="sim-panel-title">Valores Analíticos</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {(() => {
              const A = 0.5 * (params.a - params.a_2);
              const B = params.v0 - params.v0_2;
              const C = params.x0 - params.x0_2;
              let encounterTime: number | null = null;
              if (params.enableBody2) {
                if (Math.abs(A) < 1e-6) {
                  if (Math.abs(B) > 1e-6) {
                    const t = -C / B;
                    if (t >= 0) encounterTime = t;
                  }
                } else {
                  const disc = B * B - 4 * A * C;
                  if (disc >= 0) {
                    const validT = [(-B + Math.sqrt(disc)) / (2 * A), (-B - Math.sqrt(disc)) / (2 * A)]
                      .filter(t => t >= 0).sort((a,b)=>a-b);
                    if (validT.length > 0) encounterTime = validT[0];
                  }
                }
              }

              const timeToStopBody1 = (params.a !== 0 && Math.sign(params.v0) !== Math.sign(params.a)) ? -params.v0 / params.a : null;
              const distToStopBody1 = (timeToStopBody1 !== null && timeToStopBody1 >= 0) ? params.x0 - (params.v0 * params.v0) / (2 * params.a) : null;

              return (
                <>
                  <div className="value-display" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '8px 12px' }}>
                    <span className="value-name" style={{ fontSize: '0.7rem', opacity: 0.7 }}>t Frenado (1)</span>
                    <div><span className="value-number">{(timeToStopBody1 !== null && timeToStopBody1 > 0) ? timeToStopBody1.toFixed(2) : '—'}</span><span className="value-unit">s</span></div>
                  </div>
                  <div className="value-display" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '8px 12px' }}>
                    <span className="value-name" style={{ fontSize: '0.7rem', opacity: 0.7 }}>x Frenado (1)</span>
                    <div><span className="value-number">{(distToStopBody1 !== null) ? distToStopBody1.toFixed(1) : '—'}</span><span className="value-unit">m</span></div>
                  </div>

                  {params.enableBody2 && (
                    <>
                      <div className="value-display" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '8px 12px' }}>
                        <span className="value-name" style={{ fontSize: '0.7rem', opacity: 0.7 }}>t Encuentro</span>
                        <div><span className="value-number">{encounterTime !== null ? encounterTime.toFixed(2) : '—'}</span><span className="value-unit">s</span></div>
                      </div>
                      <div className="value-display" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '8px 12px' }}>
                        <span className="value-name" style={{ fontSize: '0.7rem', opacity: 0.7 }}>x Encuentro</span>
                        <div><span className="value-number">{encounterTime !== null ? (params.x0 + params.v0 * encounterTime + 0.5 * params.a * encounterTime * encounterTime).toFixed(1) : '—'}</span><span className="value-unit">m</span></div>
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        <div className="sim-panel-section">
          <div className="sim-panel-title">Escenarios Previos</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {KINEMATICS_1D_PRESETS.map((preset, i) => (
              <button key={i} className={`preset-btn ${activePreset === i ? 'active' : ''}`} onClick={() => applyPreset(i)}>
                <span>{preset.icon}</span><span>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CENTER CANVAS */}
      <div className="sim-canvas-container animate-fade-in">
        <canvas ref={simCanvasRef} style={{ width: '100%', height: '100%' }} />
        <div className="canvas-controls">
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
          <span className="canvas-zoom-label">{Math.round(zoomLevel * 100)}%</span>
          <button className="canvas-ctrl-btn" onClick={zoomOut} title="Zoom out">−</button>
          <button className="canvas-ctrl-btn" onClick={resetView} title="Reset vista">⟲</button>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="glass sim-panel animate-fade-in" style={{ animationDelay: '100ms' }}>
        <div className="sim-panel-section">
          <div className="sim-panel-title">Estado Analítico Actual</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="value-display"><div className="value-dot" style={{ background: '#6c5ce7' }} /><span className="value-name">Posición (x₁)</span><span className="value-number">{displayState.x.toFixed(2)}</span><span className="value-unit">m</span></div>
            <div className="value-display"><div className="value-dot" style={{ background: '#ff5252' }} /><span className="value-name">Velocidad (v₁)</span><span className="value-number">{displayState.v.toFixed(2)}</span><span className="value-unit">m/s</span></div>
            <div className="value-display"><div className="value-dot" style={{ background: '#00e676' }} /><span className="value-name">Aceleración (a₁)</span><span className="value-number">{displayState.a.toFixed(2)}</span><span className="value-unit">m/s²</span></div>
          </div>
          {params.enableBody2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="value-display"><div className="value-dot" style={{ background: '#e17055' }} /><span className="value-name">Posición (x₂)</span><span className="value-number">{displayState.x2.toFixed(2)}</span><span className="value-unit">m</span></div>
              <div className="value-display"><div className="value-dot" style={{ background: '#e17055' }} /><span className="value-name">Velocidad (v₂)</span><span className="value-number">{displayState.v2.toFixed(2)}</span><span className="value-unit">m/s</span></div>
              <div className="value-display"><div className="value-dot" style={{ background: '#e17055' }} /><span className="value-name">Aceler. (a₂)</span><span className="value-number">{displayState.a2.toFixed(2)}</span><span className="value-unit">m/s²</span></div>
            </div>
          )}
        </div>

        {params.enableBody2 && (
          <div className="sim-panel-section">
            <div className="sim-panel-title">Valores Analíticos</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {(() => {
                const A = 0.5 * (params.a - params.a_2);
                const B = params.v0 - params.v0_2;
                const C = params.x0 - params.x0_2;

                let encounterTime: number | null = null;
                if (Math.abs(A) < 1e-6) {
                  if (Math.abs(B) > 1e-6) {
                    const t = -C / B;
                    if (t >= 0) encounterTime = t;
                  }
                } else {
                  const disc = B * B - 4 * A * C;
                  if (disc >= 0) {
                    const t1 = (-B + Math.sqrt(disc)) / (2 * A);
                    const t2 = (-B - Math.sqrt(disc)) / (2 * A);
                    const validT = [t1, t2].filter(t => t >= 0).sort((a,b)=>a-b);
                    if (validT.length > 0) encounterTime = validT[0];
                  }
                }

                if (encounterTime !== null) {
                  const encX = params.x0 + params.v0 * encounterTime + 0.5 * params.a * encounterTime * encounterTime;
                  return (
                    <>
                      <div className="value-display" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '8px 12px' }}>
                        <span className="value-name" style={{ fontSize: '0.7rem', opacity: 0.7 }}>Tiempo de Alcance</span>
                        <div><span className="value-number">{encounterTime.toFixed(2)}</span><span className="value-unit">s</span></div>
                      </div>
                      <div className="value-display" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '8px 12px' }}>
                        <span className="value-name" style={{ fontSize: '0.7rem', opacity: 0.7 }}>Posición Alcance</span>
                        <div><span className="value-number">{encX.toFixed(2)}</span><span className="value-unit">m</span></div>
                      </div>
                    </>
                  );
                } else {
                  return (
                    <div className="value-display" style={{ gridColumn: '1 / -1', justifyContent: 'center', opacity: 0.5 }}>
                      <span className="value-name">No hay encuentro (t ≥ 0)</span>
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        )}

        <div className="chart-container">
          <div className="chart-title"><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6c5ce7' }} />Posición x(t)</div>
          <canvas ref={chartXtRef} className="chart-canvas" style={{ height: 160 }} onMouseMove={handleChartMouseMove} onMouseLeave={handleChartMouseLeave} />
        </div>
        <div className="chart-container">
          <div className="chart-title"><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5252' }} />Velocidad v(t)</div>
          <canvas ref={chartVtRef} className="chart-canvas" style={{ height: 160 }} onMouseMove={handleChartMouseMove} onMouseLeave={handleChartMouseLeave} />
        </div>
        <div className="chart-container">
          <div className="chart-title"><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00e676' }} />Aceleración a(t)</div>
          <canvas ref={chartAtRef} className="chart-canvas" style={{ height: 160 }} onMouseMove={handleChartMouseMove} onMouseLeave={handleChartMouseLeave} />
        </div>
      </div>
    </div>
  );
}
