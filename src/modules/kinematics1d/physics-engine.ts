export interface Kinematics1DParams {
  x0: number; // Initial position (m)
  v0: number; // Initial velocity (m/s)
  a: number; // Acceleration (m/s^2)
  
  // Optional second body
  enableBody2: boolean;
  x0_2: number;
  v0_2: number;
  a_2: number;
}

export interface Kinematics1DState {
  t: number;
  x: number;
  v: number;
  a: number;
  x2: number;
  v2: number;
  a2: number;
}

export function computeState1D(t: number, params: Kinematics1DParams): Kinematics1DState {
  const { x0, v0, a, enableBody2, x0_2, v0_2, a_2 } = params;
  return {
    t,
    x: x0 + v0 * t + 0.5 * a * t * t,
    v: v0 + a * t,
    a: a,
    x2: enableBody2 ? x0_2 + v0_2 * t + 0.5 * a_2 * t * t : 0,
    v2: enableBody2 ? v0_2 + a_2 * t : 0,
    a2: enableBody2 ? a_2 : 0
  };
}

export const KINEMATICS_1D_PRESETS = [
  {
    name: 'Auto Constante (MRU)',
    icon: '🚗',
    params: { x0: 0, v0: 10, a: 0, enableBody2: false, x0_2: 0, v0_2: 0, a_2: 0 }
  },
  {
    name: 'Aceleración (MRUV)',
    icon: '🚀',
    params: { x0: 0, v0: 0, a: 4, enableBody2: false, x0_2: 0, v0_2: 0, a_2: 0 }
  },
  {
    name: 'Frenado brusco',
    icon: '🛑',
    params: { x0: -50, v0: 25, a: -5, enableBody2: false, x0_2: 0, v0_2: 0, a_2: 0 }
  },
  {
    name: 'Ida y Vuelta (a < 0)',
    icon: '🔁',
    params: { x0: 0, v0: 20, a: -9.81, enableBody2: false, x0_2: 0, v0_2: 0, a_2: 0 }
  },
  {
    name: 'Encuentro / Persecución',
    icon: '💥',
    params: { 
      x0: 0, v0: 15, a: 0, 
      enableBody2: true, x0_2: 60, v0_2: -20, a_2: 0 
    }
  }
];
