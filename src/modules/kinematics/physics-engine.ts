/**
 * PhysLab Pro — Kinematics Physics Engine
 * Projectile motion with optional air resistance.
 * State: [x, y, vx, vy]
 */
import { rk4Step, type DerivativeFunction } from '../../utils/physics-engine';

export interface KinematicsParams {
  initialSpeed: number;     // m/s
  launchAngle: number;      // degrees
  gravity: number;          // m/s²
  airResistance: number;    // drag coefficient (simplified)
  height: number;           // initial launch height (m)
  targetHeight: number;     // final standing height (m)
}

export interface KinematicsState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  time: number;
  maxHeight: number;
  timeAtMaxHeight: number;
  range: number;
  hasLanded: boolean;
}

export function createDerivatives(params: KinematicsParams): DerivativeFunction {
  return (state: number[], _t: number): number[] => {
    const [_x, _y, vx, vy] = state;
    const { gravity, airResistance } = params;

    const speed = Math.sqrt(vx * vx + vy * vy);
    const drag = airResistance;

    // dx/dt = vx, dy/dt = vy
    // dvx/dt = -drag * vx * speed / m (simplified with m=1)
    // dvy/dt = -g - drag * vy * speed / m
    return [
      vx,
      vy,
      -drag * vx * speed,
      -gravity - drag * vy * speed,
    ];
  };
}

export function stepKinematics(
  stateVec: number[],
  time: number,
  dt: number,
  params: KinematicsParams
): number[] {
  const derivs = createDerivatives(params);
  let newState = rk4Step(stateVec, time, dt, derivs);

  // Ground logic
  const targetH = params.targetHeight || 0;
  
  if (targetH > 0 && newState[1] < targetH && stateVec[1] >= targetH) {
    const fraction = (stateVec[1] - targetH) / (stateVec[1] - newState[1]);
    newState[0] = stateVec[0] + (newState[0] - stateVec[0]) * fraction;
    newState[1] = targetH;
    newState[2] = stateVec[2] + (newState[2] - stateVec[2]) * fraction;
    newState[3] = stateVec[3] + (newState[3] - stateVec[3]) * fraction;
  } else if (newState[1] < 0 && stateVec[1] >= 0) {
    const fraction = (stateVec[1] - 0) / (stateVec[1] - newState[1]);
    newState[0] = stateVec[0] + (newState[0] - stateVec[0]) * fraction;
    newState[1] = 0;
    newState[2] = stateVec[2] + (newState[2] - stateVec[2]) * fraction;
    newState[3] = stateVec[3] + (newState[3] - stateVec[3]) * fraction;
  } else if (newState[1] < 0) {
    newState[1] = 0;
  }

  return newState;
}

export function getInitialState(params: KinematicsParams): number[] {
  const angleRad = (params.launchAngle * Math.PI) / 180;
  return [
    0,
    params.height,
    params.initialSpeed * Math.cos(angleRad),
    params.initialSpeed * Math.sin(angleRad),
  ];
}

export function computeKinematicsState(
  stateVec: number[],
  time: number,
  maxH: number,
  timeH: number,
  maxR: number,
  targetHeight: number
): KinematicsState {
  const [x, y, vx, vy] = stateVec;
  
  const landedOnTarget = targetHeight > 0 && Math.abs(y - targetHeight) < 0.005 && vy <= 0 && maxH >= targetHeight;
  const landedOnGround = Math.abs(y) <= 0.005 && vy <= 0;

  return {
    x, y, vx, vy,
    speed: Math.sqrt(vx * vx + vy * vy),
    time,
    maxHeight: Math.max(maxH, y),
    timeAtMaxHeight: timeH,
    range: maxR,
    hasLanded: (landedOnTarget || landedOnGround) && time > 0.01,
  };
}

export function getAnalyticalTimeOfFlight(params: KinematicsParams): number {
  if (params.airResistance > 0) return 0;
  const angleRad = (params.launchAngle * Math.PI) / 180;
  const v0y = params.initialSpeed * Math.sin(angleRad);
  const th = params.targetHeight || 0;
  
  const discriminant = v0y * v0y + 2 * params.gravity * (params.height - th);
  if (discriminant >= 0) {
    return (v0y + Math.sqrt(discriminant)) / params.gravity;
  }
  
  // If it never reaches the target height, it falls back to ground
  const disc2 = v0y * v0y + 2 * params.gravity * params.height;
  return (v0y + Math.sqrt(disc2)) / params.gravity;
}

export function getAnalyticalRange(params: KinematicsParams): number {
  if (params.airResistance > 0) return NaN;
  const rad = (params.launchAngle * Math.PI) / 180;
  const v0x = params.initialSpeed * Math.cos(rad);
  const tFlight = getAnalyticalTimeOfFlight(params);
  return v0x * tFlight;
}

export function getAnalyticalMaxHeight(params: KinematicsParams): number {
  if (params.airResistance > 0) return 0; // Requires numerical integration
  const angleRad = (params.launchAngle * Math.PI) / 180;
  const v0y = params.initialSpeed * Math.sin(angleRad);
  return params.height + (v0y * v0y) / (2 * params.gravity);
}


export const KINEMATICS_PRESETS: { name: string; icon: string; params: Partial<KinematicsParams> }[] = [
  {
    name: 'Tiro clásico 45°',
    icon: '🎯',
    params: { initialSpeed: 20, launchAngle: 45, gravity: 9.81, airResistance: 0, height: 0, targetHeight: 0 },
  },
  {
    name: 'Tiro horizontal',
    icon: '➡️',
    params: { initialSpeed: 25, launchAngle: 0, gravity: 9.81, airResistance: 0, height: 40, targetHeight: 0 },
  },
  {
    name: 'Tiro rasante',
    icon: '☄️',
    params: { initialSpeed: 30, launchAngle: 15, gravity: 9.81, airResistance: 0, height: 0, targetHeight: 0 },
  },
  {
    name: 'Tiro alto',
    icon: '⬆️',
    params: { initialSpeed: 25, launchAngle: 75, gravity: 9.81, airResistance: 0, height: 0, targetHeight: 0 },
  },
  {
    name: 'Marte (g = 3.71)',
    icon: '🟠',
    params: { initialSpeed: 20, launchAngle: 45, gravity: 3.71, airResistance: 0, height: 0, targetHeight: 0 },
  },
  {
    name: 'Luna (g = 1.62)',
    icon: '🌙',
    params: { initialSpeed: 20, launchAngle: 45, gravity: 1.62, airResistance: 0, height: 0, targetHeight: 0 },
  },
  {
    name: 'Con resistencia',
    icon: '💨',
    params: { initialSpeed: 25, launchAngle: 45, gravity: 9.81, airResistance: 0.01, height: 0, targetHeight: 0 },
  },
  {
    name: 'Tiro a objetivo elevado',
    icon: '⛰️',
    params: { initialSpeed: 25, launchAngle: 60, gravity: 9.81, airResistance: 0, height: 0, targetHeight: 15 },
  },
];
