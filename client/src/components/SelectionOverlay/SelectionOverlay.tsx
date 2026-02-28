import type { Primitive } from "shared/primitives";
import styles from "./SelectionOverlay.module.css";

type Transform = { scale: number; offsetX: number; offsetY: number };

type SelectionOverlayProps = {
  primitive: Primitive;
  transform: Transform;
  onUpdate: (id: string, changes: Partial<Primitive>) => void;
};

const toScreen = (x: number, y: number, transform: Transform) => ({
  x: x * transform.scale + transform.offsetX,
  y: y * transform.scale + transform.offsetY,
});

const toCanvas = (clientX: number, clientY: number, transform: Transform) => ({
  x: (clientX - transform.offsetX) / transform.scale,
  y: (clientY - transform.offsetY) / transform.scale,
});

export const SelectionOverlay = ({ primitive, transform, onUpdate }: SelectionOverlayProps) => {
  const minSize = 12;
  const rotationHandleOffset = 28;

  const startResize = (
    event: React.PointerEvent,
    handle: string,
    startData: Record<string, number>
  ) => {
    event.stopPropagation();
    event.preventDefault();

    const onMove = (moveEvent: PointerEvent) => {
      const point = toCanvas(moveEvent.clientX, moveEvent.clientY, transform);

      if (primitive.type === "rect") {
        const { x, y, width, height } = startData;
        let nextX = x;
        let nextY = y;
        let nextW = width;
        let nextH = height;

        if (handle.includes("left")) {
          nextX = point.x;
          nextW = x + width - point.x;
        }
        if (handle.includes("right")) {
          nextW = point.x - x;
        }
        if (handle.includes("top")) {
          nextY = point.y;
          nextH = y + height - point.y;
        }
        if (handle.includes("bottom")) {
          nextH = point.y - y;
        }

        if (nextW < minSize) {
          nextW = minSize;
          if (handle.includes("left")) {
            nextX = x + width - minSize;
          }
        }
        if (nextH < minSize) {
          nextH = minSize;
          if (handle.includes("top")) {
            nextY = y + height - minSize;
          }
        }

        onUpdate(primitive.id, { x: nextX, y: nextY, width: nextW, height: nextH });
      }

      if (primitive.type === "ellipse") {
        const { x, y, width, height } = startData;
        let nextX = x;
        let nextY = y;
        let nextW = width;
        let nextH = height;

        if (handle.includes("left")) {
          nextX = point.x;
          nextW = x + width - point.x;
        }
        if (handle.includes("right")) {
          nextW = point.x - x;
        }
        if (handle.includes("top")) {
          nextY = point.y;
          nextH = y + height - point.y;
        }
        if (handle.includes("bottom")) {
          nextH = point.y - y;
        }

        if (nextW < minSize) {
          nextW = minSize;
          if (handle.includes("left")) {
            nextX = x + width - minSize;
          }
        }
        if (nextH < minSize) {
          nextH = minSize;
          if (handle.includes("top")) {
            nextY = y + height - minSize;
          }
        }

        onUpdate(primitive.id, {
          cx: nextX + nextW / 2,
          cy: nextY + nextH / 2,
          rx: nextW / 2,
          ry: nextH / 2,
        });
      }

      if (primitive.type === "line" || primitive.type === "arrow") {
        if (handle === "start") {
          onUpdate(primitive.id, { start: point });
        } else {
          onUpdate(primitive.id, { end: point });
        }
      }
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const startRotate = (
    event: React.PointerEvent,
    center: { x: number; y: number },
    currentRotation: number
  ) => {
    event.stopPropagation();
    event.preventDefault();
    const startAngle = Math.atan2(event.clientY - center.y, event.clientX - center.x);

    const onMove = (moveEvent: PointerEvent) => {
      const angle = Math.atan2(moveEvent.clientY - center.y, moveEvent.clientX - center.x);
      let nextRotation = currentRotation + (angle - startAngle);
      if ((moveEvent as PointerEvent).shiftKey) {
        const snap = Math.PI / 12;
        nextRotation = Math.round(nextRotation / snap) * snap;
      }
      if (primitive.type === "rect" || primitive.type === "ellipse" || primitive.type === "text") {
        onUpdate(primitive.id, { rotation: nextRotation });
      }
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  if (primitive.type === "rect") {
    const topLeft = toScreen(primitive.x, primitive.y, transform);
    const width = primitive.width * transform.scale;
    const height = primitive.height * transform.scale;
    const center = { x: topLeft.x + width / 2, y: topLeft.y + height / 2 };
    return (
      <div className={styles.overlay}>
        <div className={styles.outline} style={{ left: topLeft.x, top: topLeft.y, width, height }} />
        <div
          className={styles.rotate}
          style={{ left: center.x, top: topLeft.y - rotationHandleOffset }}
          onPointerDown={(event) => startRotate(event, center, primitive.rotation ?? 0)}
        />
        {[
          { key: "top-left", x: topLeft.x, y: topLeft.y },
          { key: "top-right", x: topLeft.x + width, y: topLeft.y },
          { key: "bottom-left", x: topLeft.x, y: topLeft.y + height },
          { key: "bottom-right", x: topLeft.x + width, y: topLeft.y + height },
        ].map((handle) => (
          <div
            key={handle.key}
            className={styles.handle}
            style={{ left: handle.x, top: handle.y }}
            onPointerDown={(event) =>
              startResize(event, handle.key, {
                x: primitive.x,
                y: primitive.y,
                width: primitive.width,
                height: primitive.height,
              })
            }
          />
        ))}
      </div>
    );
  }

  if (primitive.type === "ellipse") {
    const x = primitive.cx - primitive.rx;
    const y = primitive.cy - primitive.ry;
    const topLeft = toScreen(x, y, transform);
    const width = primitive.rx * 2 * transform.scale;
    const height = primitive.ry * 2 * transform.scale;
    const center = { x: topLeft.x + width / 2, y: topLeft.y + height / 2 };
    return (
      <div className={styles.overlay}>
        <div className={`${styles.outline} ${styles.ellipse}`} style={{ left: topLeft.x, top: topLeft.y, width, height }} />
        <div
          className={styles.rotate}
          style={{ left: center.x, top: topLeft.y - rotationHandleOffset }}
          onPointerDown={(event) => startRotate(event, center, primitive.rotation ?? 0)}
        />
        {[
          { key: "top-left", x: topLeft.x, y: topLeft.y },
          { key: "top-right", x: topLeft.x + width, y: topLeft.y },
          { key: "bottom-left", x: topLeft.x, y: topLeft.y + height },
          { key: "bottom-right", x: topLeft.x + width, y: topLeft.y + height },
        ].map((handle) => (
          <div
            key={handle.key}
            className={styles.handle}
            style={{ left: handle.x, top: handle.y }}
            onPointerDown={(event) =>
              startResize(event, handle.key, {
                x,
                y,
                width: primitive.rx * 2,
                height: primitive.ry * 2,
              })
            }
          />
        ))}
      </div>
    );
  }

  if (primitive.type === "text") {
    const topLeft = toScreen(primitive.x, primitive.y, transform);
    const width = primitive.width * transform.scale;
    const height = primitive.height * transform.scale;
    const center = { x: topLeft.x + width / 2, y: topLeft.y + height / 2 };
    return (
      <div className={styles.overlay}>
        <div className={styles.outline} style={{ left: topLeft.x, top: topLeft.y, width, height }} />
        <div
          className={styles.rotate}
          style={{ left: center.x, top: topLeft.y - rotationHandleOffset }}
          onPointerDown={(event) => startRotate(event, center, primitive.rotation ?? 0)}
        />
      </div>
    );
  }

  if (primitive.type === "line" || primitive.type === "arrow") {
    const start = toScreen(primitive.start.x, primitive.start.y, transform);
    const end = toScreen(primitive.end.x, primitive.end.y, transform);
    const midCanvas = {
      x: (primitive.start.x + primitive.end.x) / 2,
      y: (primitive.start.y + primitive.end.y) / 2,
    };
    const midScreen = toScreen(midCanvas.x, midCanvas.y, transform);
    const length = Math.hypot(primitive.end.x - primitive.start.x, primitive.end.y - primitive.start.y);

    const startRotateLine = (event: React.PointerEvent) => {
      event.stopPropagation();
      event.preventDefault();

      const onMove = (moveEvent: PointerEvent) => {
        const point = toCanvas(moveEvent.clientX, moveEvent.clientY, transform);
        let angle = Math.atan2(point.y - midCanvas.y, point.x - midCanvas.x);
        if (moveEvent.shiftKey) {
          const snap = Math.PI / 12;
          angle = Math.round(angle / snap) * snap;
        }
        const dx = Math.cos(angle) * (length / 2);
        const dy = Math.sin(angle) * (length / 2);
        onUpdate(primitive.id, {
          start: { x: midCanvas.x - dx, y: midCanvas.y - dy },
          end: { x: midCanvas.x + dx, y: midCanvas.y + dy },
        });
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    };

    return (
      <div className={styles.overlay}>
        <svg className={styles.svg}>
          <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} className={styles.line} />
        </svg>
        <div
          className={styles.rotate}
          style={{ left: midScreen.x, top: midScreen.y - rotationHandleOffset }}
          onPointerDown={startRotateLine}
        />
        <div
          className={styles.handle}
          style={{ left: start.x, top: start.y }}
          onPointerDown={(event) => startResize(event, "start", {})}
        />
        <div
          className={styles.handle}
          style={{ left: end.x, top: end.y }}
          onPointerDown={(event) => startResize(event, "end", {})}
        />
      </div>
    );
  }

  return null;
};
