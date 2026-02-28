import { useEffect, useMemo } from "react";
import { useCanvas } from "../../hooks/useCanvas";
import { useBoardStore } from "../../stores/boardStore";
import { useToolStore } from "../../stores/toolStore";
import type { Primitive } from "shared/primitives";
import { TextEditor } from "../TextEditor/TextEditor";
import { SelectionOverlay } from "../SelectionOverlay/SelectionOverlay";
import styles from "./Canvas.module.css";

type CanvasProps = {
  onCreatePrimitive: (primitive: Primitive) => void;
  onUpdatePrimitive: (id: string, changes: Partial<Primitive>) => void;
  onDeletePrimitive: (id: string) => void;
  onCursorMove: (x: number, y: number) => void;
  onTransformChange: (transform: { scale: number; offsetX: number; offsetY: number }) => void;
};

export const Canvas = ({ onCreatePrimitive, onUpdatePrimitive, onDeletePrimitive, onCursorMove, onTransformChange }: CanvasProps) => {
  const { primitives } = useBoardStore();
  const { activeTool } = useToolStore();

  const {
    canvasRef,
    containerRef,
    selectedId,
    selectedTextId,
    setSelectedTextId,
    setDraftPrimitive,
    transform,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
  } = useCanvas({
    onCreatePrimitive,
    onUpdatePrimitive,
    onDeletePrimitive,
    onCursorMove,
  });

  const textPrimitives = useMemo(
    () => primitives.filter((primitive) => primitive.type === "text"),
    [primitives]
  );

  const selectedPrimitive = useMemo(
    () => primitives.find((primitive) => primitive.id === selectedId) || null,
    [primitives, selectedId]
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDraftPrimitive(null);
        setSelectedTextId(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setDraftPrimitive, setSelectedTextId]);

  useEffect(() => {
    onTransformChange(transform);
  }, [onTransformChange, transform]);

  const minor = 20 * transform.scale;
  const major = 100 * transform.scale;
  const backgroundSize = `${minor}px ${minor}px, ${minor}px ${minor}px, ${major}px ${major}px, ${major}px ${major}px`;
  const backgroundPosition = `${transform.offsetX}px ${transform.offsetY}px, ${transform.offsetX}px ${transform.offsetY}px, ${transform.offsetX}px ${transform.offsetY}px, ${transform.offsetX}px ${transform.offsetY}px`;

  const cursorClass = (() => {
    if (activeTool === "pen") return "cursor-pen";
    if (activeTool === "eraser") return "cursor-eraser";
    if (activeTool === "text") return "cursor-text";
    if (activeTool === "select") return "cursor-select";
    return "cursor-shape";
  })();

  return (
    <div className={`${styles.wrapper} ${cursorClass}`} ref={containerRef}>
      <div
        className={styles.grid}
        style={{
          backgroundSize,
          backgroundPosition,
        }}
      />
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={(event) => handlePointerUp(event)}
        onWheel={handleWheel}
      />
      {textPrimitives.map((primitive) => (
        <TextEditor
          key={primitive.id}
          primitive={primitive}
          isSelected={selectedTextId === primitive.id}
          onChange={onUpdatePrimitive}
          onCommit={(id) => {
            setSelectedTextId(null);
            onUpdatePrimitive(id, {});
          }}
        />
      ))}
      {selectedPrimitive && activeTool === "select" && (
        <SelectionOverlay primitive={selectedPrimitive} transform={transform} onUpdate={onUpdatePrimitive} />
      )}
    </div>
  );
};
