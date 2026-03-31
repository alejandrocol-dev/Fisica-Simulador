import { useRef, useCallback, useEffect, useState } from 'react';

interface SimulationLoopConfig {
  dt: number;
  speed?: number;
  onStep: (time: number, dt: number) => void;
  onRender: (time: number) => void;
}

export function useSimulationLoop(config: SimulationLoopConfig) {
  const [isRunning, setIsRunning] = useState(false);
  const [simTime, setSimTime] = useState(0);

  const rafRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const simTimeRef = useRef(0);
  const accumulatorRef = useRef(0);
  const configRef = useRef(config);
  const isRunningRef = useRef(false);
  configRef.current = config;

  const loop = useCallback((timestamp: number) => {
    if (!isRunningRef.current) {
      rafRef.current = 0;
      return;
    }

    if (!lastFrameRef.current) lastFrameRef.current = timestamp;
    const elapsed = (timestamp - lastFrameRef.current) / 1000;
    lastFrameRef.current = timestamp;

    const speed = configRef.current.speed ?? 1;
    const dt = configRef.current.dt;
    
    // Increment persistent accumulator
    accumulatorRef.current += Math.min(elapsed * speed, dt * 10);

    while (accumulatorRef.current >= dt) {
      configRef.current.onStep(simTimeRef.current, dt);
      simTimeRef.current += dt;
      accumulatorRef.current -= dt;
    }

    setSimTime(simTimeRef.current);
    configRef.current.onRender(simTimeRef.current);

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const play = useCallback(() => {
    isRunningRef.current = true;
    if (!rafRef.current) {
      lastFrameRef.current = 0;
      rafRef.current = requestAnimationFrame(loop);
    }
    setIsRunning(true);
  }, [loop]);

  const pause = useCallback(() => {
    isRunningRef.current = false;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    setIsRunning(false);
  }, []);

  const setTime = useCallback((newTime: number) => {
    // We update simulation time externally
    simTimeRef.current = newTime;
    setSimTime(newTime);
  }, []);


  const reset = useCallback(() => {
    pause();
    simTimeRef.current = 0;
    setSimTime(0);
  }, [pause]);

  const toggle = useCallback(() => {
    if (isRunningRef.current) pause();
    else play();
  }, [play, pause]);

  useEffect(() => {
    return () => {
      isRunningRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { isRunning, simTime, play, pause, toggle, reset, setTime };
}
