import { useEffect, useRef, useState } from "react";
import type { TextPrimitive } from "shared/primitives";
import styles from "./TextEditor.module.css";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";

type TextEditorProps = {
  primitive: TextPrimitive;
  isSelected: boolean;
  onChange: (id: string, changes: Partial<TextPrimitive>) => void;
  onCommit: (id: string) => void;
};

export const TextEditor = ({ primitive, isSelected, onChange, onCommit }: TextEditorProps) => {
  const [value, setValue] = useState(primitive.text);
  const debouncedValue = useDebouncedValue(value, 250);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setValue(primitive.text);
  }, [primitive.text]);

  useEffect(() => {
    if (debouncedValue !== primitive.text) {
      onChange(primitive.id, {
        text: debouncedValue,
      });
    }
  }, [debouncedValue, onChange, primitive.id, primitive.text]);

  useEffect(() => {
    if (isSelected) {
      textareaRef.current?.focus();
    }
  }, [isSelected]);

  const handleBlur = () => {
    onCommit(primitive.id);
  };

  const handleResize = (event: React.PointerEvent<HTMLDivElement>, corner: string) => {
    event.stopPropagation();
    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = primitive.width;
    const startHeight = primitive.height;

    const onMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      const nextWidth = Math.max(120, startWidth + (corner.includes("right") ? dx : -dx));
      const nextHeight = Math.max(40, startHeight + (corner.includes("bottom") ? dy : -dy));
      const nextX = corner.includes("left") ? primitive.x + dx : primitive.x;
      const nextY = corner.includes("top") ? primitive.y + dy : primitive.y;

      onChange(primitive.id, {
        width: nextWidth,
        height: nextHeight,
        x: nextX,
        y: nextY,
      });
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      onCommit(primitive.id);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div
      className={styles.wrapper}
      style={{
        transform: `translate(${primitive.x}px, ${primitive.y}px) rotate(${primitive.rotation ?? 0}rad)`,
        width: primitive.width,
        height: primitive.height,
      }}
    >
      <textarea
        ref={textareaRef}
        className={styles.textarea}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          onChange(primitive.id, {
            width: Math.max(120, primitive.width),
            height: Math.max(40, primitive.height),
          });
        }}
        onBlur={handleBlur}
        onMouseDown={(event) => event.stopPropagation()}
        style={{
          fontSize: `${primitive.fontSize}px`,
          fontFamily: primitive.fontFamily,
          color: primitive.color,
          textAlign: primitive.align,
        }}
      />
      {isSelected && (
        <>
          <div className={styles.selection} />
          <div className={styles.handle} data-corner="top-left" onPointerDown={(event) => handleResize(event, "top-left")} />
          <div className={styles.handle} data-corner="top-right" onPointerDown={(event) => handleResize(event, "top-right")} />
          <div className={styles.handle} data-corner="bottom-left" onPointerDown={(event) => handleResize(event, "bottom-left")} />
          <div className={styles.handle} data-corner="bottom-right" onPointerDown={(event) => handleResize(event, "bottom-right")} />
        </>
      )}
    </div>
  );
};
