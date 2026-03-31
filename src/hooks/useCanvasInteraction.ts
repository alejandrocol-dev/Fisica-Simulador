import { useEffect, useCallback, useRef, useState, type RefObject } from 'react';

export interface ViewTransform {
  panX: number;
  panY: number;
  zoom: number;
}

export function useCanvasInteraction(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  onTransform?: () => void,
  externalTransformRef?: RefObject<ViewTransform>
) {
  const internalTransformRef = useRef<ViewTransform>({ panX: 0, panY: 0, zoom: 1 });
  const transformRef = externalTransformRef || internalTransformRef;
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState(1);
  const onTransformRef = useRef(onTransform);

  useEffect(() => {
    onTransformRef.current = onTransform;
  }, [onTransform]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = 'grabbing';
      e.preventDefault();
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      transformRef.current.panX += dx;
      transformRef.current.panY += dy;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      onTransformRef.current?.();
    };

    const onMouseUp = () => {
      isDragging.current = false;
      canvas.style.cursor = 'grab';
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const t = transformRef.current;
      const newZoom = Math.max(0.3, Math.min(5, t.zoom * zoomFactor));
      const ratio = newZoom / t.zoom;
      t.panX = mouseX - ratio * (mouseX - t.panX);
      t.panY = mouseY - ratio * (mouseY - t.panY);
      t.zoom = newZoom;
      setZoomLevel(newZoom);
      onTransformRef.current?.();
    };

    const onDblClick = () => {
      transformRef.current = { panX: 0, panY: 0, zoom: 1 };
      setZoomLevel(1);
      onTransformRef.current?.();
    };
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('dblclick', onDblClick);
    canvas.style.cursor = 'grab';

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('dblclick', onDblClick);
    };
  }, [canvasRef]);

  const resetView = useCallback(() => {
    transformRef.current = { panX: 0, panY: 0, zoom: 1 };
    setZoomLevel(1);
  }, []);

  const setTransform = useCallback((panX: number, panY: number, zoom: number) => {
    transformRef.current = { panX, panY, zoom };
    setZoomLevel(zoom);
  }, []);

  const zoomIn = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const t = transformRef.current;
    const cx = canvas.clientWidth / 2, cy = canvas.clientHeight / 2;
    const newZoom = Math.min(5, t.zoom * 1.25);
    const ratio = newZoom / t.zoom;
    t.panX = cx - ratio * (cx - t.panX);
    t.panY = cy - ratio * (cy - t.panY);
    t.zoom = newZoom;
    setZoomLevel(newZoom);
  }, [canvasRef]);

  const zoomOut = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const t = transformRef.current;
    const cx = canvas.clientWidth / 2, cy = canvas.clientHeight / 2;
    const newZoom = Math.max(0.3, t.zoom / 1.25);
    const ratio = newZoom / t.zoom;
    t.panX = cx - ratio * (cx - t.panX);
    t.panY = cy - ratio * (cy - t.panY);
    t.zoom = newZoom;
    setZoomLevel(newZoom);
  }, [canvasRef]);

  return { transformRef, resetView, setTransform, zoomIn, zoomOut, zoomLevel };
}
