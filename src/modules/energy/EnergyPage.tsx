/**
 * Energy Sandbox — Interactive Mechanical Energy
 */
import { useRef, useCallback, useState, useEffect } from 'react';
import { useSimulationLoop } from '../../hooks/useSimulationLoop';
import { useCanvasInteraction } from '../../hooks/useCanvasInteraction';
import EditableSlider from '../../components/EditableSlider';
import {
  computeEnergyStep, ENERGY_PRESETS,
  type EnergyParams, type EnergyState, calculateEnergies
} from './physics-engine';
import { renderEnergy } from './renderer';

const DT = 1 / 60;

export default function EnergyPage() {
  const [params, setParams] = useState<EnergyParams>(ENERGY_PRESETS[0].params);
  const [speed, setSpeed] = useState(1);
  const [activePreset, setActivePreset] = useState<number>(0);

  const [showGrid, setShowGrid] = useState(true);
  const [showVectors, setShowVectors] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  const simCanvasRef = useRef<HTMLCanvasElement>(null);
  const transformRef = useRef({ panX: 0, panY: 0, zoom: 1 });
  
  const currentStateRef = useRef<EnergyState>(ENERGY_PRESETS[0].initialState);

  const onStep = useCallback((time: number, dt: number) => {
    const s = computeEnergyStep(currentStateRef.current, params, dt);
    currentStateRef.current = s;
  }, [params]);

  const onRender = useCallback(() => {
    const s = currentStateRef.current;
    const simCanvas = simCanvasRef.current;
    if (simCanvas) {
      const ctx = simCanvas.getContext('2d');
      if (ctx) renderEnergy(ctx, simCanvas, s, paramsRef.current, transformRef.current, { showGrid, showVectors, showLabels });
    }
  }, [showGrid, showVectors, showLabels]);

  const { isRunning, simTime, toggle, reset } = useSimulationLoop({ dt: DT, speed, onStep, onRender });

  const handleReset = useCallback(() => {
    reset();
    const pInfo = ENERGY_PRESETS[activePreset] || ENERGY_PRESETS[0];
    const s = { ...pInfo.initialState };
    // Maintain current params like mass, springs, v0 when resetting positional state
    s.vx = paramsRef.current.initialVelocity;
    currentStateRef.current = s;
    onRender();
  }, [reset, onRender, activePreset]);

  // Removed dragging sync refs that didn't work.
  const paramsRef = useRef(params);
  useEffect(() => { paramsRef.current = params; }, [params]);

  const dragState = useRef({ type: 'none' as 'none' | 'ball' | 'node' | 'ref', index: -1 });

  useEffect(() => {
    const canvas = simCanvasRef.current;
    if (!canvas) return;

    const toLogic = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const t = transformRef.current;
      const sx = (clientX - rect.left - t.panX) / t.zoom;
      const sy = (clientY - rect.top - t.panY) / t.zoom;
      const logicX = (sx - canvas.clientWidth / 2) / 10;
      const logicY = (sy - canvas.clientHeight * 0.7) / (-10);
      return { x: logicX, y: logicY };
    };

    const toScreenY = (logicY: number) => {
      const t = transformRef.current;
      return (canvas.clientHeight * 0.7 + logicY * 10 * -1) * t.zoom + t.panY;
    }

    const onMouseDown = (e: MouseEvent) => {
      const { x, y } = toLogic(e.clientX, e.clientY);
      const s = currentStateRef.current;
      
      // Check Ball
      const dx = x - s.x;
      const dy = y - s.y;
      if (Math.hypot(dx, dy) <= paramsRef.current.radius * 2) {
        dragState.current.type = 'ball';
        s.isDraggingBall = true;
        s.vx = 0; s.vy = 0;
        e.stopPropagation(); 
        return;
      }

      // Check Nodes
      const currentNodes = paramsRef.current.nodes;
      for (let i = 0; i < currentNodes.length; i++) {
        const ndx = x - currentNodes[i].x;
        const ndy = y - currentNodes[i].y;
        if (Math.hypot(ndx, ndy) <= 4) {
          if (e.button === 2) {
            e.preventDefault();
            e.stopPropagation();
            if (currentNodes.length > 2) {
              const newN = [...currentNodes];
              newN.splice(i, 1);
              setParams(p => ({ ...p, nodes: newN }));
            }
            return;
          }
          dragState.current.type = 'node';
          dragState.current.index = i;
          e.stopPropagation();
          return;
        }
      }
    };

    const onDoubleClick = (e: MouseEvent) => {
      e.stopPropagation();
      const { x, y } = toLogic(e.clientX, e.clientY);
      const currentNodes = paramsRef.current.nodes;
      for (let i = 0; i < currentNodes.length - 1; i++) {
        const p1 = currentNodes[i], p2 = currentNodes[i+1];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len2 = dx * dx + dy * dy;
        let t = 0;
        if (len2 > 0) t = ((x - p1.x) * dx + (y - p1.y) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        const projX = p1.x + t * dx;
        const projY = p1.y + t * dy;
        const dist = Math.hypot(x - projX, y - projY);
        
        if (dist <= 4) {
           const newN = [...currentNodes];
           newN.splice(i + 1, 0, { x, y });
           setParams(p => ({ ...p, nodes: newN }));
           return;
        }
      }
    };
    
    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    const onMouseMove = (e: MouseEvent) => {
      if (dragState.current.type === 'none') return;
      e.stopPropagation();
      const { x, y } = toLogic(e.clientX, e.clientY);

      if (dragState.current.type === 'ball') {
        const s = currentStateRef.current;
        s.x = x; s.y = y;
        s.vx = 0; s.vy = 0;
        if (!isRunning) onRender();
      } else if (dragState.current.type === 'node') {
        const i = dragState.current.index;
        let snappedX = x;
        let snappedY = y;
        
        const snapTo = (nx: number, ny: number, targetX: number, targetY: number) => {
           const dx = nx - targetX;
           const dy = ny - targetY;
           const Math_angle = Math.atan2(dy, dx) * 180 / Math.PI;
           const snappedAngle = Math.round(Math_angle / 15) * 15;
           const diff = Math.abs(Math_angle - snappedAngle);
           if (diff < 5 || diff > 355) { // within 5 degrees snap range
              const r = Math.hypot(dx, dy);
              const rad = snappedAngle * Math.PI / 180;
              return { x: targetX + r * Math.cos(rad), y: targetY + r * Math.sin(rad), snapped: true };
           }
           return { x: nx, y: ny, snapped: false };
        };

        const currentNodes = paramsRef.current.nodes;
        if (i > 0) {
            const res = snapTo(x, y, currentNodes[i-1].x, currentNodes[i-1].y);
            if (res.snapped) { 
              const dist = Math.hypot(res.x - currentNodes[i-1].x, res.y - currentNodes[i-1].y);
              const snappedDist = Math.round(dist / 2.5) * 2.5;
              const ratio = snappedDist / dist;
              snappedX = currentNodes[i-1].x + (res.x - currentNodes[i-1].x) * ratio;
              snappedY = currentNodes[i-1].y + (res.y - currentNodes[i-1].y) * ratio;
            }
        }
        // Give priority to snap left-to-right flow
        if (snappedX === x && i < currentNodes.length - 1) {
            const res = snapTo(x, y, currentNodes[i+1].x, currentNodes[i+1].y);
            if (res.snapped) { 
              const dist = Math.hypot(res.x - currentNodes[i+1].x, res.y - currentNodes[i+1].y);
              const snappedDist = Math.round(dist / 2.5) * 2.5;
              const ratio = snappedDist / dist;
              snappedX = currentNodes[i+1].x + (res.x - currentNodes[i+1].x) * ratio;
              snappedY = currentNodes[i+1].y + (res.y - currentNodes[i+1].y) * ratio;
            }
        }

        // Enforce ground limit
        snappedY = Math.max(0, snappedY);

        paramsRef.current.nodes[i] = { x: snappedX, y: snappedY };
        if (!isRunning) onRender();
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (dragState.current.type === 'ball') {
        currentStateRef.current.isDraggingBall = false;
        
        // Snap to closest track point
        const { x, y } = currentStateRef.current;
        let minDist = Infinity;
        let snapX = x, snapY = y;
        
        const nodes = paramsRef.current.nodes;
        for (let i = 0; i < nodes.length - 1; i++) {
            const p1 = nodes[i];
            const p2 = nodes[i+1];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const len2 = dx * dx + dy * dy;
            let t = ((x - p1.x) * dx + (y - p1.y) * dy) / len2;
            t = Math.max(0, Math.min(1, t));
            const projX = p1.x + t * dx;
            const projY = p1.y + t * dy;
            const d = Math.hypot(x - projX, y - projY);
            if (d < minDist) {
                minDist = d;
                snapX = projX;
                snapY = projY;
            }
        }
        
        currentStateRef.current.x = snapX;
        currentStateRef.current.y = snapY + paramsRef.current.radius + 0.1;
        currentStateRef.current.vx = paramsRef.current.initialVelocity;
        currentStateRef.current.vy = 0;
        currentStateRef.current.flightMode = false;
        onRender();
      }
      
      if (dragState.current.type === 'node') {
         setParams({ ...paramsRef.current });
      }
      
      dragState.current.type = 'none';
      dragState.current.index = -1;
    };

    canvas.addEventListener('mousedown', onMouseDown, { capture: true });
    canvas.addEventListener('dblclick', onDoubleClick, { capture: true });
    canvas.addEventListener('contextmenu', onContextMenu, { capture: true });
    window.addEventListener('mousemove', onMouseMove, { capture: true });
    window.addEventListener('mouseup', onMouseUp, { capture: true });

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown, { capture: true });
      canvas.removeEventListener('dblclick', onDoubleClick, { capture: true });
      canvas.removeEventListener('contextmenu', onContextMenu, { capture: true });
      window.removeEventListener('mousemove', onMouseMove, { capture: true });
      window.removeEventListener('mouseup', onMouseUp, { capture: true });
    };
  }, [isRunning, onRender]);

  // Handle zooming & panning separately
  const { resetView, setTransform, zoomIn, zoomOut, zoomLevel } = useCanvasInteraction(simCanvasRef, onRender, transformRef);
  
  // Set initial position
  useEffect(() => {
    const w = simCanvasRef.current?.clientWidth || 800;
    const h = simCanvasRef.current?.clientHeight || 600;
    const newZoom = 0.45;
    const cx = w / 2;
    const cy = h / 2;
    setTransform(cx - cx * newZoom, (cy - cy * newZoom) + 50, newZoom);
    onRender();
  }, []);

  useEffect(() => { // Force re-register
    const handleEvents = () => {};
  }, [params]);

  const applyPreset = (i: number) => {
    const preset = ENERGY_PRESETS[i];
    if (preset) {
      setParams(preset.params);
      currentStateRef.current = { ...preset.initialState };
      setActivePreset(i);
      reset();
      onRender();
    }
  };

  const energies = calculateEnergies(currentStateRef.current, params);

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
          <div className="sim-panel-title">Parámetros</div>
          <EditableSlider label="Masa (m)" value={params.mass} min={0.5} max={10} step={0.5} unit="kg" onChange={v => setParams(p => ({ ...p, mass: v }))} decimals={1} />
          
          <div style={{ marginTop: 15, marginBottom: 15, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10 }}>
            <div className="sim-panel-title" style={{ fontSize: '0.9rem', marginBottom: 10, color: 'rgba(255,255,255,0.8)' }}>Rozamiento por Tramo (μk)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
               {params.muKs && Array.from({length: params.nodes.length - 1}).map((_, i) => (
                  <EditableSlider key={i} label={`Tramo ${i + 1}`} value={params.muKs[i] || 0} min={0} max={1} step={0.01} unit="" 
                    onChange={v => setParams(p => { 
                        const m = [...(p.muKs || [])]; m[i] = v; return { ...p, muKs: m };
                    })} decimals={2} />
               ))}
            </div>
          </div>

          <EditableSlider label="Muelle (k)" value={params.springK} min={1} max={50} step={1} unit="N/m" onChange={v => setParams(p => ({ ...p, springK: v }))} decimals={0} />
          {params.hasRightSpring && <EditableSlider label="Largo Resorte Der" value={params.springL} min={1} max={50} step={1} unit="m" onChange={v => setParams(p => ({ ...p, springL: v }))} decimals={0} />}
          <EditableSlider label="Velocidad Inical" value={params.initialVelocity} min={0} max={50} step={1} unit="m/s" onChange={v => {
            setParams(p => ({ ...p, initialVelocity: v }));
            if (!isRunning) {
              currentStateRef.current.vx = v;
              onRender();
            }
          }} decimals={0} />
          <EditableSlider label="Gravedad (g)" value={params.gravity} min={1} max={20} step={0.1} unit="m/s²" onChange={v => setParams(p => ({ ...p, gravity: v }))} decimals={2} />
          
          
          <div style={{ marginTop: 15 }}>
            <button 
              className={`preset-btn ${params.hasRightSpring ? 'active' : ''}`} 
              onClick={() => setParams(p => ({ ...p, hasRightSpring: !p.hasRightSpring }))} 
              style={{ width: '100%', padding: '6px' }}>
              Incluir Resorte (Derecha)
            </button>
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: 5 }}>Objeto:</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                className={`preset-btn ${params.objectType === 'ball' ? 'active' : ''}`} 
                onClick={() => setParams(p => ({ ...p, objectType: 'ball' }))} 
                style={{ flex: 1, padding: '6px' }}>
                Pelota ⏺
              </button>
              <button 
                className={`preset-btn ${params.objectType === 'block' ? 'active' : ''}`} 
                onClick={() => setParams(p => ({ ...p, objectType: 'block' }))} 
                style={{ flex: 1, padding: '6px' }}>
                Bloque ⏹
              </button>
            </div>
          </div>
        </div>

        <div className="sim-panel-section">
          <div className="sim-panel-title">Fricción Disipativa</div>
          <p style={{ fontSize: '0.8rem', color: '#ea80fc', marginBottom: 5 }}>
            Wnf = ΔEm
          </p>
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
             Energía Perdida: <b style={{color: '#ea80fc'}}>{energies.thermal.toFixed(1)} J</b>
          </p>
        </div>

        <div className="sim-panel-section">
          <div className="sim-panel-title">Escenarios</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {ENERGY_PRESETS.map((preset, i) => (
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
          <button className={`canvas-ctrl-btn ${showGrid ? 'active' : ''}`} onClick={() => setShowGrid(!showGrid)} title="Cuadrícula">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h18v18H3zM9 3v18M15 3v18M3 9h18M3 15h18" /></svg>
          </button>
          <button className={`canvas-ctrl-btn ${showVectors ? 'active' : ''}`} onClick={() => setShowVectors(!showVectors)} title="Vectores">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="19" x2="19" y2="5"></line><polyline points="9 5 19 5 19 15"></polyline></svg>
          </button>
          <button className={`canvas-ctrl-btn ${showLabels ? 'active' : ''}`} onClick={() => setShowLabels(!showLabels)} title="Info/Etiquetas">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          </button>
          <div className="canvas-ctrl-divider" />
          <button className="canvas-ctrl-btn" onClick={zoomIn} title="Zoom in">+</button>
          <span className="canvas-zoom-label">{Math.round(zoomLevel * 100)}%</span>
          <button className="canvas-ctrl-btn" onClick={zoomOut} title="Zoom out">−</button>
          <button className="canvas-ctrl-btn" onClick={resetView} title="Reset vista">⟲</button>
        </div>
      </div>

      {/* RIGHT PANEL - Live Formulas and UI Chart */}
      <div className="glass sim-panel animate-fade-in" style={{ animationDelay: '100ms', width: 340 }}>
        
        <div className="sim-panel-section">
          <div className="sim-panel-title" style={{ fontSize: '1rem', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Gráfico de Barras J</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 15, padding: '0 10px' }}>
            {[
              { label: 'Energía Cinética', color: '#448aff', val: Math.max(0, energies.kinetic) },
              { label: 'Pot. Gravitatoria', color: '#ff5252', val: energies.potentialGrav },
              { label: 'Pot. Elástica', color: '#00e676', val: Math.max(0, energies.potentialElastic) },
              { label: 'Energía Disipada', color: '#ea80fc', val: Math.max(0, energies.thermal) },
              { label: 'Energía Mecánica Total', color: '#ffd740', val: energies.total },
            ].map((item, i) => {
              const maxScale = Math.max(10, Math.abs(energies.total) + Math.abs(energies.thermal));
              const widthPct = Math.min(100, Math.max(0, (item.val / maxScale) * 100));
              
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.8rem', marginBottom: 4 }}>
                    <span style={{ fontWeight: 'bold', color: item.color }}>{item.label}</span>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>{item.val.toFixed(0)} J</span>
                  </div>
                  <div style={{ width: '100%', height: 16, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      width: `${widthPct}%`, height: '100%', background: item.color
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="sim-panel-section" style={{ marginTop: 20 }}>
          <div className="sim-panel-title" style={{ fontSize: '1rem', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Datos Teóricos</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 15 }}>
             {params.nodes.map((_, i) => {
                const event = currentStateRef.current.nodeEvents[i];
                const char = String.fromCharCode(65 + i);
                return (
                  <div key={i} style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ color: '#00e5ff', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: 4 }}>Nodo {char}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>t: <span style={{color: '#fff'}}>{event ? event.t.toFixed(2) : '--'} s</span></div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>v: <span style={{color: '#fff'}}>{event ? event.v.toFixed(1) : '--'} m/s</span></div>
                    </div>
                  </div>
                );
             })}

             <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '0.85rem', color: '#ffd740', marginBottom: 6 }}>Estado Actual:</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                   <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Velocidad: <span style={{color: '#fff'}}>{Math.hypot(currentStateRef.current.vx, currentStateRef.current.vy).toFixed(1)} m/s</span></div>
                   <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Altura (h): <span style={{color: '#ff5252'}}>{(currentStateRef.current.y - params.referenceY).toFixed(1)} m</span></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                   <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Tiemp. Parada: <span style={{color: '#fff'}}>{currentStateRef.current.stopTime ? currentStateRef.current.stopTime.toFixed(2) + ' s' : 'En mov.'}</span></div>
                   <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Vel. Final: <span style={{color: '#fff'}}>{currentStateRef.current.stopTime ? '0.0 m/s' : '--'}</span></div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
