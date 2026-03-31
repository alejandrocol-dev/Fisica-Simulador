/**
 * Dynamics Sandbox — 2D Interactive Physics
 */
import { useRef, useCallback, useState, useEffect } from 'react';
import { useSimulationLoop } from '../../hooks/useSimulationLoop';
import { useCanvasInteraction } from '../../hooks/useCanvasInteraction';
import EditableSlider from '../../components/EditableSlider';
import { drawChart } from '../../utils/chart-renderer';
import {
  computeDynamicsStep, DYNAMICS_PRESETS,
  type DynamicsParams, type DynamicsState, type Vector2
} from './physics-engine';
import { renderDynamics } from './renderer';

const DT = 1 / 60;
const MAX_CHART_POINTS = 600;

export default function DynamicsPage() {
  const [params, setParams] = useState<DynamicsParams>(DYNAMICS_PRESETS[0].params);
  const [speed, setSpeed] = useState(1);
  const [activePreset, setActivePreset] = useState<number>(0);

  const [showGrid, setShowGrid] = useState(true);
  const [showVectors, setShowVectors] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  const simCanvasRef = useRef<HTMLCanvasElement>(null);
  const chartXtRef = useRef<HTMLCanvasElement>(null);

  const transformRef = useRef({ panX: 0, panY: 0, zoom: 1 });
  
  const historyRef = useRef<{ xt: {x: number, y: number}[] }>({ xt: [] });

  const currentStateRef = useRef<DynamicsState>(DYNAMICS_PRESETS[0].initialState);
  const [displayState, setDisplayState] = useState<DynamicsState>(currentStateRef.current);

  const onStep = useCallback((time: number, dt: number) => {
    const s = computeDynamicsStep(currentStateRef.current, params, dt);
    currentStateRef.current = s;
    const h = historyRef.current;
    if (!s.isDraggingBall) {
      h.xt.push({ x: s.time, y: s.x });
      if (h.xt.length > MAX_CHART_POINTS) h.xt.shift();
    }
  }, [params]);

  const onRender = useCallback(() => {
    const s = currentStateRef.current;
    setDisplayState({ ...s });
    const simCanvas = simCanvasRef.current;
    if (simCanvas) {
      const ctx = simCanvas.getContext('2d');
      if (ctx) renderDynamics(ctx, simCanvas, s, params, transformRef.current, { showGrid, showVectors, showLabels });
    }
    const c1 = chartXtRef.current;
    if (c1) {
      const ctx = c1.getContext('2d');
      if (ctx) drawChart(ctx, c1, [{ label: 'x(t)', color: '#00e676', data: historyRef.current.xt }], { xLabel: 't', yLabel: 'x', xUnit: 's', yUnit: 'm', showDot: true });
    }
  }, [params, showGrid, showVectors, showLabels]);

  const isDraggingSimRef = useRef(false);

  // Use refs for drag to avoid re-binds
  const paramsRef = useRef(params);
  useEffect(() => { paramsRef.current = params; }, [params]);

  const { resetView, zoomIn, zoomOut, zoomLevel } = useCanvasInteraction(simCanvasRef, onRender, transformRef);
  const { isRunning, simTime, toggle, reset } = useSimulationLoop({ dt: DT, speed, onStep, onRender });

  const handleReset = useCallback(() => {
    reset();
    historyRef.current = { xt: [] };
    const pInfo = DYNAMICS_PRESETS[activePreset] || DYNAMICS_PRESETS[0];
    const s = { ...pInfo.initialState };
    currentStateRef.current = s;
    setParams(pInfo.params);
    setDisplayState(s);
    onRender();
  }, [reset, onRender, activePreset]);

  // Dragging interaction
  useEffect(() => {
    const canvas = simCanvasRef.current;
    if (!canvas) return;

    let dragType: 'none' | 'ball' | 'node' = 'none';
    let dragNodeIndex = -1;

    const toLogic = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const t = transformRef.current;
      const sx = (clientX - rect.left - t.panX) / t.zoom;
      const sy = (clientY - rect.top - t.panY) / t.zoom;
      const logicX = (sx - canvas.clientWidth / 2) / 10;
      const logicY = (sy - canvas.clientHeight * 0.8) / (-10);
      return { x: logicX, y: logicY };
    };

    const onMouseDown = (e: MouseEvent) => {
      const { x, y } = toLogic(e.clientX, e.clientY);
      const s = currentStateRef.current;
      
      // Check ball
      const dx = x - s.x;
      const dy = y - s.y;
      if (Math.hypot(dx, dy) <= paramsRef.current.radius * 2) {
        dragType = 'ball';
        s.isDraggingBall = true;
        s.vx = 0; s.vy = 0;
        e.stopPropagation();
        return;
      }

      // Check nodes
      const currentNodes = paramsRef.current.nodes;
      for (let i = 0; i < currentNodes.length; i++) {
        const ndx = x - currentNodes[i].x;
        const ndy = y - currentNodes[i].y;
        if (Math.hypot(ndx, ndy) <= 4) {
          dragType = 'node';
          dragNodeIndex = i;
          e.stopPropagation();
          return;
        }
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (dragType === 'none') return;
      e.stopPropagation();
      const { x, y } = toLogic(e.clientX, e.clientY);

      if (dragType === 'ball') {
        const s = currentStateRef.current;
        s.x = x; s.y = y;
        s.vx = 0; s.vy = 0;
        if (!isRunning) onRender();
      } else if (dragType === 'node') {
        setParams(p => {
          const newNodes = [...p.nodes];
          newNodes[dragNodeIndex] = { x, y };
          return { ...p, nodes: newNodes };
        });
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (dragType === 'ball') {
        currentStateRef.current.isDraggingBall = false;
      }
      dragType = 'none';
      dragNodeIndex = -1;
    };

    canvas.addEventListener('mousedown', onMouseDown, { capture: true });
    window.addEventListener('mousemove', onMouseMove, { capture: true });
    window.addEventListener('mouseup', onMouseUp, { capture: true });

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown, { capture: true });
      window.removeEventListener('mousemove', onMouseMove, { capture: true });
      window.removeEventListener('mouseup', onMouseUp, { capture: true });
    };
  }, [isRunning, onRender]);

  // Patch wheel/drag interactions
  useEffect(() => {
    const canvas = simCanvasRef.current;
    if (!canvas) return;
    const preventPanWhenDragging = (e: Event) => {
      if (isDraggingSimRef.current) e.stopPropagation();
    }
    canvas.addEventListener('mousedown', preventPanWhenDragging, { capture: true });
    return () => canvas.removeEventListener('mousedown', preventPanWhenDragging, {capture: true});
  }, []);

  const applyPreset = (i: number) => {
    setActivePreset(i);
    setTimeout(() => handleReset(), 0);
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
          <div className="sim-panel-title">Velocidad Sim.</div>
          <EditableSlider label="Velocidad" value={speed} min={0.1} max={5} step={0.1} unit="x" onChange={setSpeed} decimals={1} />
        </div>

        <div className="sim-panel-section">
          <div className="sim-panel-title">Física de Sandbox</div>
          <p style={{ fontSize: '0.75rem', color: '#ffb74d', marginBottom: 10 }}>Arrastra la bola o los nodos celestes para interactuar.</p>
          <EditableSlider label="Fricción Cinética (μk)" value={params.muK} min={0} max={1} step={0.01} unit="" onChange={v => setParams(p => ({ ...p, muK: v }))} decimals={2} />
          <EditableSlider label="Rebote (Restitución)" value={params.restitution} min={0} max={1} step={0.05} unit="" onChange={v => setParams(p => ({ ...p, restitution: v }))} decimals={2} />
          <EditableSlider label="Gravedad (g)" value={params.gravity} min={1} max={20} step={0.1} unit="m/s²" onChange={v => setParams(p => ({ ...p, gravity: v }))} decimals={2} />
        </div>

        <div className="sim-panel-section">
          <div className="sim-panel-title">Terrenos (Presets)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {DYNAMICS_PRESETS.map((preset, i) => (
              <button key={i} className={`preset-btn ${activePreset === i ? 'active' : ''}`} onClick={() => applyPreset(i)}>
                <span>{preset.icon}</span><span>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CENTER CANVAS */}
      <div className="sim-canvas-container animate-fade-in">
        <canvas ref={simCanvasRef} style={{ width: '100%', height: '100%', touchAction: 'none' }} />
        <div className="canvas-controls">
          <button className={`canvas-ctrl-btn ${showGrid ? 'active' : ''}`} onClick={() => setShowGrid(!showGrid)} title="Cuadrícula">#️⃣</button>
          <button className={`canvas-ctrl-btn ${showVectors ? 'active' : ''}`} onClick={() => setShowVectors(!showVectors)} title="Vectores">↗️</button>
          <button className={`canvas-ctrl-btn ${showLabels ? 'active' : ''}`} onClick={() => setShowLabels(!showLabels)} title="Info">📝</button>
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
          <div className="sim-panel-title">Estado de la Bola</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="value-display"><div className="value-dot" style={{ background: '#00e676' }} /><span className="value-name">Posición (x)</span><span className="value-number">{displayState.x.toFixed(1)}</span><span className="value-unit">m</span></div>
            <div className="value-display"><div className="value-dot" style={{ background: '#00e676' }} /><span className="value-name">Posición (y)</span><span className="value-number">{displayState.y.toFixed(1)}</span><span className="value-unit">m</span></div>
            <div className="value-display"><div className="value-dot" style={{ background: '#448aff' }} /><span className="value-name">Velocidad (vx)</span><span className="value-number">{displayState.vx.toFixed(1)}</span><span className="value-unit">m/s</span></div>
            <div className="value-display"><div className="value-dot" style={{ background: '#448aff' }} /><span className="value-name">Velocidad (vy)</span><span className="value-number">{displayState.vy.toFixed(1)}</span><span className="value-unit">m/s</span></div>
          </div>
        </div>

        <div className="chart-container">
          <div className="chart-title">📊 Posición x(t)</div>
          <canvas ref={chartXtRef} className="chart-canvas" style={{ height: 120 }} />
        </div>
      </div>
    </div>
  );
}
