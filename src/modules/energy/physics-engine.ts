/**
 * Energy Module — Physics Engine
 * Sandbox logic for Conservation of Mechanical Energy.
 * Simulates a particle moving across a polyline track, computing Kinetic, Gravitational Potential,
 * and Elastic Potential energies. Includes friction and spring mechanics.
 */

export interface Vector2 { x: number; y: number; }

export interface EnergyParams {
  mass: number;         // kg
  gravity: number;      // m/s^2
  muKs: number[];       // Kinetic friction coefficient per segment
  springK: number;      // Spring constant N/m
  springL: number;      // Right spring length
  leftSpringL: number;  // Left spring length
  hasLeftSpring: boolean;
  hasRightSpring: boolean;
  objectType: 'ball' | 'block';
  radius: number;       // Radius/Size of the particle/block
  initialVelocity: number;
  nodes: Vector2[];     // Polyline terrain points
  referenceY: number;   // Y level where Potential Energy = 0
}

export interface EnergyForces {
  kinetic: number;
  potentialGrav: number;
  potentialElastic: number;
  total: number;
  thermal: number; // Disipated by friction
}

export interface EnergyState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  time: number;
  isDraggingBall: boolean;
  isDraggingRef: boolean;
  thermalEnergy: number; // Accumulated friction loss
  flightMode: boolean;   // True if not touching the track
  
  // Vectors for rendering
  lastNormal: Vector2;
  lastTangent: Vector2;
  accelFriction: number;
  accelSpring: number;
  nodeEvents: Record<number, { v: number, t: number }>;
  stopTime?: number;
  finalVelocity?: number;
}

export const ENERGY_PRESETS = [
  {
    name: 'Predeterminado',
    icon: '🎢',
    params: {
      mass: 2, gravity: 9.81, muKs: [0, 0, 0, 0, 0], springK: 20, springL: 10, leftSpringL: 15, hasLeftSpring: false, hasRightSpring: true, objectType: 'ball' as const, radius: 2.5, initialVelocity: 20, referenceY: 0,
      nodes: [
        { x: -100, y: 68.5 }, { x: -70, y: 68.5 }, { x: -6.4, y: 4.9 }, { x: 18.6, y: 4.9 }, { x: 36.3, y: 22.6 }, { x: 66.3, y: 22.6 }
      ]
    },
    initialState: { x: -95, y: 71.1, vx: 20, vy: 0, time: 0, isDraggingBall: false, isDraggingRef: false, thermalEnergy: 0, flightMode: false, lastNormal: {x:0, y:1}, lastTangent: {x:1, y:0}, accelFriction: 0, accelSpring: 0, nodeEvents: {} }
  },
  {
    name: 'Laboratorio de Rampa',
    icon: '🏢',
    params: {
      mass: 1, gravity: 9.81, muKs: [0.17, 0], springK: 5, springL: 15, leftSpringL: 15, hasLeftSpring: false, hasRightSpring: true, objectType: 'ball' as const, radius: 2.5, initialVelocity: 0, referenceY: 0,
      nodes: [
        { x: -100, y: 113 }, { x: 13, y: 0 }, { x: 80, y: 0 }
      ]
    },
    initialState: { x: -97, y: 110, vx: 0, vy: 0, time: 0, isDraggingBall: false, isDraggingRef: false, thermalEnergy: 0, flightMode: false, lastNormal: {x:0, y:1}, lastTangent: {x:1, y:0}, accelFriction: 0, accelSpring: 0, nodeEvents: {} }
  }
];

function closestPointSegmentWithNormal(p: Vector2, a: Vector2, b: Vector2): { point: Vector2, normal: Vector2, dist: number, t: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return { point: a, normal: { x: 0, y: 1 }, dist: Math.hypot(p.x-a.x, p.y-a.y), t: 0 };
  
  let t = ((p.x - a.x)*dx + (p.y - a.y)*dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const point = { x: a.x + t*dx, y: a.y + t*dy };
  
  // Normal always points "up" (y > 0 in physics coords)
  let nx = -dy / Math.sqrt(len2);
  let ny = dx / Math.sqrt(len2);
  if (ny < 0) { nx = -nx; ny = -ny; }
  
  const dist = Math.hypot(p.x - point.x, p.y - point.y);
  return { point, normal: {x: nx, y: ny}, dist, t };
}

export function computeEnergyStep(state: EnergyState, params: EnergyParams, dt: number): EnergyState {
  if (state.isDraggingBall || state.isDraggingRef) {
    return { ...state, vx: 0, vy: 0 };
  }

  let x = state.x;
  let y = state.y;
  let vx = state.vx;
  let vy = state.vy - params.gravity * dt; // Apply gravity
  let thermal = state.thermalEnergy;
  let wasFlight = state.flightMode;
  let fricAccDisplay = 0;
  let sAcc = 0;

  const rightSpringX = params.nodes[params.nodes.length - 1].x - params.springL;
  const leftSpringX = params.nodes[0].x + params.leftSpringL;

  if (params.hasRightSpring && x + params.radius > rightSpringX) {
      const compression = (x + params.radius) - rightSpringX;
      if (compression > 0) {
        const springForce = -params.springK * compression;
        sAcc = springForce / params.mass;
        vx += sAcc * dt;
      }
  }

  if (params.hasLeftSpring && x - params.radius < leftSpringX) {
      const compression = leftSpringX - (x - params.radius);
      if (compression > 0) {
        const springForce = params.springK * compression;
        sAcc = springForce / params.mass;
        vx += sAcc * dt;
      }
  }

  x += vx * dt;
  y += vy * dt;

  let collided = false;
  let flight = true;
  let normalVec = {x: 0, y: 1};
  let tangentVec = {x: 1, y: 0};
  let fricAcc = 0;

  let bestCol = null;

  for (let i = 0; i < params.nodes.length - 1; i++) {
    const p1 = params.nodes[i];
    const p2 = params.nodes[i+1];
    
    // Check bounding box
    const minX = Math.min(p1.x, p2.x) - params.radius;
    const maxX = Math.max(p1.x, p2.x) + params.radius;
    if (x < minX || x > maxX) continue;

    const res = closestPointSegmentWithNormal({ x, y }, p1, p2);

    let forcePull = false;

    if (res.dist <= params.radius * 1.5) { // Increased sticky range
      const dot = (x - res.point.x) * res.normal.x + (y - res.point.y) * res.normal.y;
      if (dot > -params.radius) {
        if (!bestCol || res.dist < bestCol.dist) {
          bestCol = { ...res, p1, p2, i, forcePull: !wasFlight ? false : true };
        }
      }
    } else if (!wasFlight && x >= Math.min(p1.x, p2.x) && x <= Math.max(p1.x, p2.x)) {
      if (!bestCol || res.dist < bestCol.dist) {
        bestCol = { ...res, p1, p2, i, forcePull: true };
      }
    }
  }

  // Collision logic
  if (bestCol) {
    flight = false;
    const { point, normal, dist, p1, p2, i: bestIdx, t: bestT } = bestCol;
    
    // Normal and Tangent calculation
    let currentNormal = { ...normal };
    let currentTangent = { x: p2.x - p1.x, y: p2.y - p1.y };
    const segmentLength = Math.hypot(currentTangent.x, currentTangent.y);
    currentTangent.x /= segmentLength;
    currentTangent.y /= segmentLength;

    if (currentTangent.x * (p2.x - p1.x) + currentTangent.y * (p2.y - p1.y) < 0) {
      currentTangent.x = -currentTangent.x; currentTangent.y = -currentTangent.y;
    }

    normalVec = currentNormal;
    tangentVec = currentTangent;

    // Resolve overlap (Position correction)
    const push = params.radius - dist;
    if (push > 0 || bestCol.forcePull) {
      x += currentNormal.x * push;
      y += currentNormal.y * push;
    }

    // Preserve speed when traversing sharp corners if grounded
    const previousSpeed = Math.hypot(vx, vy);
    
    // Resolve velocity against normal
    const vDotN = vx * currentNormal.x + vy * currentNormal.y;
    if (vDotN < 0 || (bestCol.forcePull && !wasFlight)) {
      vx -= vDotN * currentNormal.x;
      vy -= vDotN * currentNormal.y;
    }
    
    // Re-apply the EXACT previous speed along the new tangent constraint if we were already on the track
    if (!wasFlight && previousSpeed > 0 && dist < params.radius + 0.1) {
       const vDotT = vx * currentTangent.x + vy * currentTangent.y;
       // dir forces the object to keep moving forward despite acute angle transitions
       const dir = vDotT >= 0 ? 1 : -1;
       vx = currentTangent.x * previousSpeed * dir;
       vy = currentTangent.y * previousSpeed * dir;
    }

    // Sliding Forces (Gravity component)
    const gravityDotT = 0 * currentTangent.x + (-params.gravity) * currentTangent.y;
    vx += currentTangent.x * gravityDotT * dt;
    vy += currentTangent.y * gravityDotT * dt;

    // Friction
    const muK = params.muKs[bestIdx] || 0;
    const vAlongT = vx * currentTangent.x + vy * currentTangent.y;
    if (muK > 0 && Math.abs(vAlongT) > 0.01) {
      const N = params.mass * params.gravity * Math.max(0, currentNormal.y);
      const fricAcc = (muK * N) / params.mass;
      const deltaV = fricAcc * dt;
      
      const energyBefore = 0.5 * params.mass * (vx*vx + vy*vy);
      if (Math.abs(vAlongT) <= deltaV) {
        vx -= vAlongT * currentTangent.x;
        vy -= vAlongT * currentTangent.y;
        fricAccDisplay = Math.abs(vAlongT) / dt;
      } else {
        vx -= (vAlongT / Math.abs(vAlongT)) * deltaV * currentTangent.x;
        vy -= (vAlongT / Math.abs(vAlongT)) * deltaV * currentTangent.y;
        fricAccDisplay = fricAcc;
      }
      const energyAfter = 0.5 * params.mass * (vx*vx + vy*vy);
      thermal += Math.max(0, energyBefore - energyAfter);
    }
  }

  if (y < -200) { y = -200; vy = 0; flight = false; }

  // Record node events (passing through nodes)
  const nodeEvents = { ...state.nodeEvents };
  params.nodes.forEach((node, i) => {
    // Check if we passed the node X coordinate this step
    const prevX = state.x;
    if ((prevX <= node.x && x >= node.x) || (prevX >= node.x && x <= node.x)) {
       // Only record if we are sufficiently close in Y (meaning on the track or near it)
       const distY = Math.abs(y - node.y);
       if (distY < params.radius * 2) {
         nodeEvents[i] = { v: Math.hypot(vx, vy), t: state.time + dt };
       }
    }
  });

  let stopTime = state.stopTime;
  let finalVelocity = state.finalVelocity;

  if (!flight && Math.hypot(vx, vy) < 0.05 && Math.abs(state.vx) > 0.05) {
     if (!stopTime) {
       stopTime = state.time + dt;
       finalVelocity = 0;
     }
  }

  return { 
    ...state, 
    x, y, vx, vy, 
    time: state.time + dt, 
    thermalEnergy: thermal, 
    flightMode: flight,
    lastNormal: normalVec,
    lastTangent: tangentVec,
    accelFriction: fricAccDisplay,
    accelSpring: sAcc,
    nodeEvents,
    stopTime,
    finalVelocity
  };
}

export function calculateEnergies(state: EnergyState, params: EnergyParams): EnergyForces {
  const v2 = state.vx * state.vx + state.vy * state.vy;
  const kinetic = 0.5 * params.mass * v2;
  const potentialGrav = params.mass * params.gravity * (state.y - params.referenceY);
  
  let potentialElastic = 0;
  const rightSpringX = params.nodes[params.nodes.length - 1].x - params.springL;
  const leftSpringX = params.nodes[0].x + params.leftSpringL;

  // Calculate spring compression energy
  if (params.hasRightSpring && state.x + params.radius > rightSpringX) {
     const c = (state.x + params.radius) - rightSpringX;
     potentialElastic += 0.5 * params.springK * c * c;
  }
  if (params.hasLeftSpring && state.x - params.radius < leftSpringX) {
     const c = leftSpringX - (state.x - params.radius);
     potentialElastic += 0.5 * params.springK * c * c;
  }

  const total = kinetic + potentialGrav + potentialElastic;

  return { kinetic, potentialGrav, potentialElastic, total, thermal: state.thermalEnergy };
}
