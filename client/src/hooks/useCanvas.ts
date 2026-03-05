import { useCallback, useEffect, useRef, useState } from "react";
import type { Primitive, Shape3DPrimitive, StrokePrimitive, TextPrimitive } from "shared/primitives";
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
  const { activeTool, strokeColor, strokeWidth, auto3dEnabled } = useToolStore();
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
    const pixelRatio = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const primitivesForRender = selectedTextId
      ? primitives.filter((primitive) => !(primitive.type === "text" && primitive.id === selectedTextId))
      : primitives;
    renderScene(ctx, primitivesForRender, transform, pixelRatio);
    if (draftPrimitive && draftPrimitive.type !== "text") {
      renderScene(ctx, [draftPrimitive], transform, pixelRatio);
    }
  }, [primitives, transform, draftPrimitive, selectedTextId]);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = rect.width * pixelRatio;
    canvas.height = rect.height * pixelRatio;
    redraw();
  }, [redraw]);

  useResizeObserver(containerRef.current, handleResize);

  useEffect(() => {
    handleResize();
  }, [handleResize]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleReload = () => redraw();
    canvas.addEventListener("imagereload", handleReload as EventListener);
    return () => {
      canvas.removeEventListener("imagereload", handleReload as EventListener);
    };
  }, [redraw]);

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTool === "text") {
      event.preventDefault();
      event.stopPropagation();
      const point = toCanvasPoint(event.clientX, event.clientY);
      if (selectedTextId) {
        setSelectedTextId(null);
      }
      const primitive: TextPrimitive = {
        id: createId(),
        type: "text",
        x: point.x,
        y: point.y,
        width: 180,
        height: 40,
        text: "",
        fontSize: 18,
        fontFamily: "IBM Plex Sans",
        color: strokeColor,
        align: "left",
        rotation: 0,
        createdBy: sessionId,
      };
      onCreatePrimitive(primitive);
      setSelectedTextId(primitive.id);
      setDraftPrimitive(primitive);
      setIsDrawing(false);
      return;
    }
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

    if (selectedTextId && activeTool !== "select") {
      setSelectedTextId(null);
    }

    if (activeTool === "select") {
      const hit = [...primitives].reverse().find((primitive) => hitTestPrimitive(primitive, point.x, point.y));
      if (hit) {
        setSelectedId(hit.id);
        setSelectedTextId(hit.type === "text" ? hit.id : null);
        setDragTextId(hit.id);
        if (hit.type === "rect" || hit.type === "text" || hit.type === "image") {
          setDragOffset({ x: point.x - hit.x, y: point.y - hit.y });
        } else if (hit.type === "ellipse") {
          setDragOffset({ x: point.x - hit.cx, y: point.y - hit.cy });
        } else if (hit.type === "shape3d") {
          setDragOffset({ x: point.x - hit.position.x, y: point.y - hit.position.y });
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
        } else if (item.type === "rect" || item.type === "image") {
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
        } else if (item.type === "shape3d") {
          onUpdatePrimitive(item.id, {
            position: { ...item.position, x: point.x - dragOffset.x, y: point.y - dragOffset.y },
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

    if (activeTool === "eraser") {
      const hit = [...primitives].reverse().find((primitive) => hitTestPrimitive(primitive, point.x, point.y));
      if (hit && hit.id !== lastEraseId) {
        onDeletePrimitive(hit.id);
        setLastEraseId(hit.id);
      }
      return;
    }

    if (!isDrawing || !draftPrimitive) return;

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
        return;
      }
      if (draftPrimitive.type === "pen" && auto3dEnabled) {
        const converted = detectShape3d(draftPrimitive, strokeColor, sessionId);
        if (converted) {
          onCreatePrimitive(converted);
          setDraftPrimitive(null);
          setIsDrawing(false);
          setLastEraseId(null);
          return;
        }
      }
      onCreatePrimitive(draftPrimitive);
      setDraftPrimitive(null);
      setIsDrawing(false);
      setLastEraseId(null);
    }
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
    draftPrimitive,
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

const detectShape3d = (
  stroke: StrokePrimitive,
  color: string,
  createdBy: string
): Shape3DPrimitive | null => {
  if (stroke.points.length < 10) return null;
  const points = stroke.points;
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  points.forEach((point) => {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  });
  const width = maxX - minX;
  const height = maxY - minY;
  if (width < 18 || height < 18) return null;
  const center = { x: minX + width / 2, y: minY + height / 2 };

  const isClosed = (() => {
    const first = points[0];
    const last = points[points.length - 1];
    const distance = Math.hypot(last.x - first.x, last.y - first.y);
    return distance < Math.min(width, height) * 0.35;
  })();

  const simplified = simplifyStroke(points, 12);
  const corners = simplified.filter((_, index) =>
    index === 0 || index === simplified.length - 1 ? false : isCorner(simplified, index, 0.65)
  );
  const cornerCount = corners.length + (isClosed ? 1 : 0);

  const avgRadius = points.reduce((sum, point) => sum + Math.hypot(point.x - center.x, point.y - center.y), 0) / points.length;
  const radiusVariance = Math.sqrt(
    points.reduce((sum, point) => {
      const r = Math.hypot(point.x - center.x, point.y - center.y);
      return sum + Math.pow(r - avgRadius, 2);
    }, 0) / points.length
  );
  const circleScore = avgRadius > 0 ? radiusVariance / avgRadius : 1;
  const aspect = width / height;
  const area = polygonArea(points);
  const perimeter = pathLength(points);
  const circularity = perimeter > 0 ? (4 * Math.PI * area) / (perimeter * perimeter) : 0;
  const isCircle =
    isClosed &&
    aspect > 0.8 &&
    aspect < 1.25 &&
    circleScore < 0.22 &&
    circularity > 0.78;
  if (isCircle) {
    return {
      id: stroke.id,
      type: "shape3d",
      shape: "sphere",
      position: { x: center.x, y: center.y, z: 0 },
      size: { x: width, y: height, z: Math.max(width, height) },
      rotation: { x: 0, y: 0, z: 0 },
      color,
      createdBy,
    };
  }

  if (isClosed && cornerCount >= 3 && cornerCount <= 5) {
    if (cornerCount === 3 && circularity < 0.7) {
      return {
        id: stroke.id,
        type: "shape3d",
        shape: "pyramid",
        position: { x: center.x, y: center.y, z: 0 },
        size: { x: width, y: height, z: Math.max(width, height) * 0.9 },
        rotation: { x: -Math.PI / 8, y: Math.PI / 8, z: 0 },
        color,
        createdBy,
      };
    }
    if (cornerCount >= 4 && circularity < 0.78) {
      return {
        id: stroke.id,
        type: "shape3d",
        shape: "cube",
        position: { x: center.x, y: center.y, z: 0 },
        size: { x: width, y: height, z: Math.max(width, height) },
        rotation: { x: -Math.PI / 10, y: Math.PI / 7, z: 0 },
        color,
        createdBy,
      };
    }
  }

  const length = pathLength(points);
  const straightness = length > 0 ? Math.hypot(width, height) / length : 0;
  const lineLike = straightness > 0.9 && (width > height * 4 || height > width * 4);
  if (lineLike) {
    const long = Math.max(width, height);
    const short = Math.min(width, height);
    return {
      id: stroke.id,
      type: "shape3d",
      shape: "cylinder",
      position: { x: center.x, y: center.y, z: 0 },
      size: { x: short * 1.2, y: long, z: short * 1.2 },
      rotation: { x: Math.PI / 2, y: 0, z: 0 },
      color,
      createdBy,
    };
  }

  return null;
};

const pathLength = (points: { x: number; y: number }[]) => {
  let length = 0;
  for (let i = 1; i < points.length; i += 1) {
    length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return length;
};

const polygonArea = (points: { x: number; y: number }[]) => {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y - points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
};

const simplifyStroke = (points: { x: number; y: number }[], step: number) => {
  const simplified: { x: number; y: number }[] = [];
  for (let i = 0; i < points.length; i += step) {
    simplified.push(points[i]);
  }
  if (simplified[simplified.length - 1] !== points[points.length - 1]) {
    simplified.push(points[points.length - 1]);
  }
  return simplified;
};

const isCorner = (points: { x: number; y: number }[], index: number, threshold: number) => {
  const prev = points[index - 1];
  const current = points[index];
  const next = points[index + 1];
  if (!prev || !current || !next) return false;
  const a = Math.hypot(current.x - prev.x, current.y - prev.y);
  const b = Math.hypot(next.x - current.x, next.y - current.y);
  const c = Math.hypot(next.x - prev.x, next.y - prev.y);
  if (a === 0 || b === 0) return false;
  const cos = (a * a + b * b - c * c) / (2 * a * b);
  return cos < threshold;
};
