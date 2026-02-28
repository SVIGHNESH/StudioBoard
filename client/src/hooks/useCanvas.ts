import { useCallback, useEffect, useRef, useState } from "react";
import type { Primitive, StrokePrimitive, TextPrimitive } from "shared/primitives";
import { renderScene } from "../lib/render";
import { hitTestPrimitive } from "../lib/hitTest";
import { useBoardStore } from "../stores/boardStore";
import { useToolStore } from "../stores/toolStore";
import { useUserStore } from "../stores/userStore";
import { createId } from "../lib/uuid";
import { useResizeObserver } from "./useResizeObserver";
import { useThrottle } from "./useThrottle";

type Transform = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

const defaultTransform: Transform = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};

type UseCanvasProps = {
  onCreatePrimitive: (primitive: Primitive) => void;
  onUpdatePrimitive: (id: string, changes: Partial<Primitive>) => void;
  onDeletePrimitive: (id: string) => void;
  onCursorMove: (x: number, y: number) => void;
};

export const useCanvas = ({ onCreatePrimitive, onUpdatePrimitive, onDeletePrimitive, onCursorMove }: UseCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { primitives } = useBoardStore();
  const { activeTool, strokeColor, strokeWidth } = useToolStore();
  const { sessionId } = useUserStore();
  const [transform, setTransform] = useState<Transform>(defaultTransform);
  const [isPanning, setIsPanning] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [draftPrimitive, setDraftPrimitive] = useState<Primitive | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [dragTextId, setDragTextId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastEraseId, setLastEraseId] = useState<string | null>(null);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const activePointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchState = useRef<{
    startDistance: number;
    startScale: number;
    startOffsetX: number;
    startOffsetY: number;
    startMidpoint: { x: number; y: number };
  } | null>(null);

  const toCanvasPoint = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = (clientX - rect.left - transform.offsetX) / transform.scale;
    const y = (clientY - rect.top - transform.offsetY) / transform.scale;
    return { x, y };
  };

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderScene(ctx, primitives, transform);
    if (draftPrimitive) {
      renderScene(ctx, [draftPrimitive], transform);
    }
  }, [primitives, transform, draftPrimitive]);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    }
    redraw();
  }, [redraw]);

  useResizeObserver(containerRef.current, handleResize);

  useEffect(() => {
    handleResize();
  }, [handleResize]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    if (event.pointerType === "touch") {
      activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (activePointers.current.size === 2) {
        const [p1, p2] = Array.from(activePointers.current.values());
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        pinchState.current = {
          startDistance: Math.hypot(dx, dy),
          startScale: transform.scale,
          startOffsetX: transform.offsetX,
          startOffsetY: transform.offsetY,
          startMidpoint: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
        };
        setIsPanning(true);
        setIsDrawing(false);
        setDraftPrimitive(null);
        return;
      }
      if (activeTool === "select") {
        setIsPanning(true);
        lastPointer.current = { x: event.clientX, y: event.clientY };
        return;
      }
    }
    if (event.button === 1 || event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) {
      setIsPanning(true);
      lastPointer.current = { x: event.clientX, y: event.clientY };
      return;
    }

    const point = toCanvasPoint(event.clientX, event.clientY);

    if (activeTool === "select") {
      const hit = [...primitives].reverse().find((primitive) => hitTestPrimitive(primitive, point.x, point.y));
      if (hit) {
        setSelectedId(hit.id);
        setSelectedTextId(hit.type === "text" ? hit.id : null);
        setDragTextId(hit.id);
        if (hit.type === "rect" || hit.type === "text") {
          setDragOffset({ x: point.x - hit.x, y: point.y - hit.y });
        } else if (hit.type === "ellipse") {
          setDragOffset({ x: point.x - hit.cx, y: point.y - hit.cy });
        } else if (hit.type === "line" || hit.type === "arrow") {
          setDragOffset({ x: point.x - hit.start.x, y: point.y - hit.start.y });
        } else {
          const origin = hit.points[0];
          setDragOffset({ x: point.x - origin.x, y: point.y - origin.y });
        }
        event.currentTarget.style.cursor = "grabbing";
      } else {
        setSelectedId(null);
        setSelectedTextId(null);
        event.currentTarget.style.cursor = "default";
      }
      return;
    }

    if (activeTool === "eraser") {
      const hit = [...primitives].reverse().find((primitive) => hitTestPrimitive(primitive, point.x, point.y));
      if (hit) {
        onDeletePrimitive(hit.id);
        setLastEraseId(hit.id);
      }
      setIsDrawing(true);
      return;
    }

    setIsDrawing(true);
    if (activeTool === "pen") {
      const primitive: StrokePrimitive = {
        id: createId(),
        type: "pen",
        points: [point],
        color: strokeColor,
        width: strokeWidth,
        createdBy: sessionId,
      };
      setDraftPrimitive(primitive);
    }

    if (activeTool === "line") {
      setDraftPrimitive({
        id: createId(),
        type: "line",
        start: point,
        end: point,
        color: strokeColor,
        width: strokeWidth,
        createdBy: sessionId,
      });
    }

    if (activeTool === "rect") {
      setDraftPrimitive({
        id: createId(),
        type: "rect",
        x: point.x,
        y: point.y,
        width: 0,
        height: 0,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        rotation: 0,
        createdBy: sessionId,
      });
    }

    if (activeTool === "ellipse") {
      setDraftPrimitive({
        id: createId(),
        type: "ellipse",
        cx: point.x,
        cy: point.y,
        rx: 0,
        ry: 0,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        rotation: 0,
        createdBy: sessionId,
      });
    }

    if (activeTool === "arrow") {
      setDraftPrimitive({
        id: createId(),
        type: "arrow",
        start: point,
        end: point,
        color: strokeColor,
        width: strokeWidth,
        createdBy: sessionId,
      });
    }

    if (activeTool === "text") {
      const primitive: TextPrimitive = {
        id: createId(),
        type: "text",
        x: point.x,
        y: point.y,
        width: 180,
        height: 40,
        text: "New text",
        fontSize: 18,
        fontFamily: "IBM Plex Sans",
        color: strokeColor,
        align: "left",
        rotation: 0,
        createdBy: sessionId,
      };
      setDraftPrimitive(primitive);
    }
  };

  const throttledCursor = useThrottle(onCursorMove, 120);

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === "touch") {
      event.preventDefault();
    }
    if (event.pointerType === "touch") {
      activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (activePointers.current.size >= 2 && pinchState.current) {
        const [p1, p2] = Array.from(activePointers.current.values());
        const midpoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const scale = Math.min(
          5,
          Math.max(0.2, pinchState.current.startScale * (Math.hypot(dx, dy) / pinchState.current.startDistance))
        );
        const originX = (pinchState.current.startMidpoint.x - pinchState.current.startOffsetX) / pinchState.current.startScale;
        const originY = (pinchState.current.startMidpoint.y - pinchState.current.startOffsetY) / pinchState.current.startScale;
        const nextOffsetX = midpoint.x - originX * scale;
        const nextOffsetY = midpoint.y - originY * scale;
        setTransform({ scale, offsetX: nextOffsetX, offsetY: nextOffsetY });
        return;
      }
    }
    const point = toCanvasPoint(event.clientX, event.clientY);
    throttledCursor(point.x, point.y);

    if (isPanning && lastPointer.current) {
      const deltaX = event.clientX - lastPointer.current.x;
      const deltaY = event.clientY - lastPointer.current.y;
      setTransform((prev) => ({
        ...prev,
        offsetX: prev.offsetX + deltaX,
        offsetY: prev.offsetY + deltaY,
      }));
      lastPointer.current = { x: event.clientX, y: event.clientY };
      return;
    }

    if (dragTextId && dragOffset) {
      const item = primitives.find((primitive) => primitive.id === dragTextId);
      if (item) {
        if (item.type === "text") {
          onUpdatePrimitive(item.id, {
            x: point.x - dragOffset.x,
            y: point.y - dragOffset.y,
          });
        } else if (item.type === "rect") {
          onUpdatePrimitive(item.id, {
            x: point.x - dragOffset.x,
            y: point.y - dragOffset.y,
          });
        } else if (item.type === "ellipse") {
          onUpdatePrimitive(item.id, {
            cx: point.x - dragOffset.x,
            cy: point.y - dragOffset.y,
          });
        } else if (item.type === "line" || item.type === "arrow") {
          const dx = point.x - dragOffset.x - item.start.x;
          const dy = point.y - dragOffset.y - item.start.y;
          onUpdatePrimitive(item.id, {
            start: { x: item.start.x + dx, y: item.start.y + dy },
            end: { x: item.end.x + dx, y: item.end.y + dy },
          });
        } else if (item.type === "pen" || item.type === "eraser") {
          const dx = point.x - dragOffset.x - item.points[0].x;
          const dy = point.y - dragOffset.y - item.points[0].y;
          onUpdatePrimitive(item.id, {
            points: item.points.map((p) => ({ x: p.x + dx, y: p.y + dy, pressure: p.pressure })),
          });
        }
      }
      return;
    }

    if (!isDrawing || !draftPrimitive) return;

    if (activeTool === "eraser") {
      const hit = [...primitives].reverse().find((primitive) => hitTestPrimitive(primitive, point.x, point.y));
      if (hit && hit.id !== lastEraseId) {
        onDeletePrimitive(hit.id);
        setLastEraseId(hit.id);
      }
      return;
    }

    if (draftPrimitive.type === "pen") {
      const last = draftPrimitive.points[draftPrimitive.points.length - 1];
      if (last && Math.hypot(point.x - last.x, point.y - last.y) < 1.5) {
        return;
      }
      setDraftPrimitive({
        ...draftPrimitive,
        points: [...draftPrimitive.points, point],
      });
    }

    if (draftPrimitive.type === "line") {
      setDraftPrimitive({ ...draftPrimitive, end: point });
    }

    if (draftPrimitive.type === "rect") {
      const rawWidth = point.x - draftPrimitive.x;
      const rawHeight = point.y - draftPrimitive.y;
      const nextWidth = Math.abs(rawWidth);
      const nextHeight = Math.abs(rawHeight);
      setDraftPrimitive({
        ...draftPrimitive,
        width: nextWidth,
        height: nextHeight,
        x: rawWidth < 0 ? point.x : draftPrimitive.x,
        y: rawHeight < 0 ? point.y : draftPrimitive.y,
      });
    }

    if (draftPrimitive.type === "ellipse") {
      setDraftPrimitive({
        ...draftPrimitive,
        rx: Math.abs(point.x - draftPrimitive.cx),
        ry: Math.abs(point.y - draftPrimitive.cy),
      });
    }

    if (draftPrimitive.type === "arrow") {
      setDraftPrimitive({ ...draftPrimitive, end: point });
    }
  };

  const handlePointerUp = (event?: React.PointerEvent<HTMLCanvasElement>) => {
    if (event) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      if (event.pointerType === "touch") {
        activePointers.current.delete(event.pointerId);
        if (activePointers.current.size < 2) {
          pinchState.current = null;
          setIsPanning(false);
        }
      }
    }
    if (isPanning) {
      setIsPanning(false);
      lastPointer.current = null;
      return;
    }

    if (dragTextId) {
      setDragTextId(null);
      setDragOffset(null);
      if (event) {
        event.currentTarget.style.cursor = "default";
      }
      return;
    }

    if (draftPrimitive) {
      if (draftPrimitive.type === "text") {
        const textDraft = draftPrimitive as TextPrimitive;
        onCreatePrimitive(textDraft);
        setSelectedTextId(textDraft.id);
      } else {
        onCreatePrimitive(draftPrimitive);
      }
    }

    setDraftPrimitive(null);
    setIsDrawing(false);
    setLastEraseId(null);
  };

  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const delta = -event.deltaY * 0.0012;
    const scale = Math.min(5, Math.max(0.2, transform.scale * (1 + delta)));

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const originX = (pointerX - transform.offsetX) / transform.scale;
    const originY = (pointerY - transform.offsetY) / transform.scale;

    const nextOffsetX = pointerX - originX * scale;
    const nextOffsetY = pointerY - originY * scale;

    setTransform({ scale, offsetX: nextOffsetX, offsetY: nextOffsetY });
  };

  return {
    canvasRef,
    containerRef,
    transform,
    selectedId,
    selectedTextId,
    setSelectedTextId,
    setTransform,
    setDraftPrimitive,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
  };
};
