/**
 * PhysLab Pro — Oscillations / SHM Physics Engine
 * Mass-spring system with damping.
 * State: [position, velocity]
 * 
 * Equation: m*x'' + b*x' + k*x = 0
 * => x'' = -(k/m)*x - (b/m)*x'
 */
import { rk4Step, type DerivativeFunction } from '../../utils/physics-engine';

export interface OscillationParams {
  mass: number;        // kg
  springK: number;     // N/m
  damping: number;     // damping coefficient (b)
  amplitude: number;   // initial amplitude (m)
  gravity: number;     // for pendulum mode
}

export interface OscillationState {
  position: number;    // x (m)
  velocity: number;    // v (m/s)
  acceleration: number;
  time: number;
  kineticEnergy: number;
  potentialEnergy: number;
  totalEnergy: number;
}

export function createDerivatives(params: OscillationParams): DerivativeFunction {
  return (state: number[], _t: number): number[] => {
    const [x, v] = state;
    const { mass, springK, damping } = params;

    // x' = v
    // v' = -(k/m)*x - (b/m)*v
    const dxdt = v;
    const dvdt = -(springK / mass) * x - (damping / mass) * v;

    return [dxdt, dvdt];
  };
}

export function computeState(
  stateVec: number[],
  time: number,
  params: OscillationParams
): OscillationState {
  const [x, v] = stateVec;
  const { mass, springK } = params;
  const a = -(springK / mass) * x - (params.damping / mass) * v;
  const ke = 0.5 * mass * v * v;
  const pe = 0.5 * springK * x * x;

  return {
    position: x,
    velocity: v,
    acceleration: a,
    time,
    kineticEnergy: ke,
    potentialEnergy: pe,
    totalEnergy: ke + pe,
  };
}

export function stepSimulation(
  stateVec: number[],
  time: number,
  dt: number,
  params: OscillationParams
): number[] {
  const derivs = createDerivatives(params);
  return rk4Step(stateVec, time, dt, derivs);
}

export function getAnalyticalPeriod(params: OscillationParams): number {
  return 2 * Math.PI * Math.sqrt(params.mass / params.springK);
}

export function getAnalyticalFrequency(params: OscillationParams): number {
  return Math.sqrt(params.springK / params.mass) / (2 * Math.PI);
}

export function getAngularFrequency(params: OscillationParams): number {
  return Math.sqrt(params.springK / params.mass);
}

export const OSCILLATION_PRESETS: { name: string; icon: string; params: Partial<OscillationParams> }[] = [
  {
    name: 'Armónico puro',
    icon: '〰️',
    params: { mass: 1, springK: 10, damping: 0, amplitude: 0.5 },
  },
  {
    name: 'Subamortiguado',
    icon: '📉',
    params: { mass: 1, springK: 10, damping: 1, amplitude: 0.5 },
  },
  {
    name: 'Críticamente amortiguado',
    icon: '🎯',
    params: { mass: 1, springK: 10, damping: 6.32, amplitude: 0.5 },
  },
  {
    name: 'Sobreamortiguado',
    icon: '🐌',
    params: { mass: 1, springK: 10, damping: 12, amplitude: 0.5 },
  },
  {
    name: 'Alta frecuencia',
    icon: '⚡',
    params: { mass: 0.5, springK: 50, damping: 0.2, amplitude: 0.3 },
  },
  {
    name: 'Resorte suave',
    icon: '🪶',
    params: { mass: 2, springK: 2, damping: 0.1, amplitude: 0.8 },
  },
];
