import { useToolStore } from "../../stores/toolStore";
import styles from "./ToolHints.module.css";

export const ToolHints = () => {
  const { activeTool } = useToolStore();

  const hintMap: Record<string, string> = {
    select: "Select and drag text",
    pen: "Draw freehand strokes",
    eraser: "Click to remove a shape",
    line: "Drag to draw a line",
    rect: "Drag to draw a rectangle",
    ellipse: "Drag to draw an ellipse",
    arrow: "Drag to draw an arrow",
    text: "Click to add editable text",
  };

  return <div className={styles.hint}>{hintMap[activeTool]}</div>;
};
