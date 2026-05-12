/**
 * PhysLab Pro — Core Physics Engine
 * Runge-Kutta 4th Order (RK4) numerical integrator
 * for solving ordinary differential equations with high precision.
 */

export type State = number[];
export type DerivativeFunction = (state: State, t: number) => State;

/**
 * Performs a single RK4 integration step.
 * @param state Current state vector
 * @param t Current time
 * @param dt Time step
 * @param derivs Function computing derivatives from state and time
 * @returns New state vector after dt
 */
export function rk4Step(
  state: State,
  t: number,
  dt: number,
  derivs: DerivativeFunction
): State {
  const n = state.length;

  // k1
  const k1 = derivs(state, t);

  // k2
  const s2 = new Array(n);
  for (let i = 0; i < n; i++) s2[i] = state[i] + 0.5 * dt * k1[i];
  const k2 = derivs(s2, t + 0.5 * dt);

  // k3
  const s3 = new Array(n);
  for (let i = 0; i < n; i++) s3[i] = state[i] + 0.5 * dt * k2[i];
  const k3 = derivs(s3, t + 0.5 * dt);

  // k4
  const s4 = new Array(n);
  for (let i = 0; i < n; i++) s4[i] = state[i] + dt * k3[i];
  const k4 = derivs(s4, t + dt);

  // Combine
  const result = new Array(n);
  for (let i = 0; i < n; i++) {
    result[i] = state[i] + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
  }

  return result;
}

/**
 * Clamps a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linearly interpolates between a and b.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Maps a value from one range to another.
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

/**
 * Calculates the Euclidean distance between two points.
 */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Normalizes a vector [x, y].
 */
export function normalize(x: number, y: number): [number, number] {
  const len = Math.sqrt(x * x + y * y);
  if (len === 0) return [0, 0];
  return [x / len, y / len];
}

/**
 * Converts degrees to radians.
 */
export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Converts radians to degrees.
 */
export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}
