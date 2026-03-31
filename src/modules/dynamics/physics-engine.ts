/**
 * Dynamics — 2D Sandbox Sandbox Physics Engine
 * Circle vs Polyline collision, gravity, restitution, friction.
 */

export interface Vector2 { x: number; y: number; }

export interface DynamicsParams {
  mass: number;
  gravity: number;
  muK: number;         // kinetic friction
  restitution: number; // bounciness (0 = inelastic, 1 = perfectly elastic)
  radius: number;      // radius of the ball
  nodes: Vector2[];    // the terrain polyline points
}

export interface DynamicsState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  time: number;
  isDraggingBall: boolean;
}

export const DYNAMICS_PRESETS = [
  {
    name: 'Rampa simple',
    icon: '🎿',
    params: {
      mass: 5, gravity: 9.81, muK: 0.1, restitution: 0.3, radius: 2,
      nodes: [ { x: -20, y: 30 }, { x: -10, y: 30 }, { x: 30, y: 0 }, { x: 100, y: 0 } ]
    },
    initialState: { x: -15, y: 35, vx: 0, vy: 0, time: 0, isDraggingBall: false }
  },
  {
    name: 'Cuenco (Bowl)',
    icon: '🥣',
    params: {
      mass: 5, gravity: 9.81, muK: 0.05, restitution: 0.7, radius: 2,
      nodes: [
        { x: -30, y: 40 }, { x: -25, y: 20 }, { x: -15, y: 5 },
        { x: 0, y: 0 }, { x: 15, y: 5 }, { x: 25, y: 20 }, { x: 30, y: 40 }
      ]
    },
    initialState: { x: -28, y: 45, vx: 0, vy: 0, time: 0, isDraggingBall: false }
  },
  {
    name: 'Pirámide y Saltos',
    icon: '⛰️',
    params: {
      mass: 5, gravity: 9.81, muK: 0.2, restitution: 0.4, radius: 2,
      nodes: [ { x: -40, y: 20 }, { x: -20, y: 0 }, { x: 0, y: 15 }, { x: 20, y: 0 }, { x: 60, y: 0 } ]
    },
    initialState: { x: -35, y: 25, vx: 0, vy: 0, time: 0, isDraggingBall: false }
  },
];

function closestPointOnSegment(p: Vector2, a: Vector2, b: Vector2): { point: Vector2, t: number, normal: Vector2 } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;

  if (len2 === 0) return { point: a, t: 0, normal: { x: 0, y: 1 } };

  // Calculate standard normal pointing "up" from segment
  let nx = -dy / Math.sqrt(len2);
  let ny = dx / Math.sqrt(len2);
  if (ny < 0) { nx = -nx; ny = -ny; } // Force normal to always point somewhat "up"

  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));

  return { point: { x: a.x + t * dx, y: a.y + t * dy }, t, normal: { x: nx, y: ny } };
}

export function computeDynamicsStep(
  state: DynamicsState,
  params: DynamicsParams,
  dt: number
): DynamicsState {
  if (state.isDraggingBall) {
    return { ...state, time: state.time + dt, vx: 0, vy: 0 };
  }

  // Semi-implicit Euler
  let vy = state.vy - params.gravity * dt;
  let vx = state.vx;
  
  let x = state.x + vx * dt;
  let y = state.y + vy * dt;

  const substeps = 4;
  const subDt = dt / substeps;
  
  // To avoid tunneling we should use substep collisions if moving super fast, but for this demo a single pass projection usually suffices if speed is reasonable.
  let collided = false;

  for (let i = 0; i < params.nodes.length - 1; i++) {
    const p1 = params.nodes[i];
    const p2 = params.nodes[i + 1];

    const { point, normal } = closestPointOnSegment({ x, y }, p1, p2);

    const distVecX = x - point.x;
    const distVecY = y - point.y;
    const dist = Math.sqrt(distVecX * distVecX + distVecY * distVecY);

    if (dist > 0 && dist < params.radius) {
      // Determine if the ball is "above" the segment or below. 
      // Dot product of distance vector and normal
      const dot = distVecX * normal.x + distVecY * normal.y;
      if (dot > -params.radius * 0.5) { // Ensure we only collide from the "top/normal" side to avoid glitching under
        // Push out
        const pushDist = params.radius - dist;
        x += normal.x * pushDist;
        y += normal.y * pushDist;

        // Velocity resolution
        const vDotN = vx * normal.x + vy * normal.y;
        if (vDotN < 0) {
          // Bounce
          vx -= (1 + params.restitution) * vDotN * normal.x;
          vy -= (1 + params.restitution) * vDotN * normal.y;

          // Friction
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const len = Math.sqrt(dx*dx + dy*dy);
          const tx = dx / len;
          const ty = dy / len;
          const vDotT = vx * tx + vy * ty;

          const frictionMagnitude = Math.min(Math.abs(vDotT), params.muK * Math.abs(vDotN));
          const fDir = -Math.sign(vDotT);
          
          vx += tx * frictionMagnitude * fDir;
          vy += ty * frictionMagnitude * fDir;
        }
        collided = true;
      }
    }
  }

  // Floor boundary (safety net at y = -50)
  if (y < -50) {
    y = -50;
    vy = Math.abs(vy) * params.restitution;
  }

  return { ...state, x, y, vx, vy, time: state.time + dt };
}
