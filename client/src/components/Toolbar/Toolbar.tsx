import styles from "./Toolbar.module.css";
import { useToolStore } from "../../stores/toolStore";
import type { ToolType } from "../../stores/toolStore";

type ToolbarProps = {
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
};

const tools: { id: ToolType; label: string }[] = [
  { id: "select", label: "Select" },
  { id: "pen", label: "Pen" },
  { id: "eraser", label: "Erase" },
  { id: "line", label: "Line" },
  { id: "rect", label: "Rect" },
  { id: "ellipse", label: "Ellipse" },
  { id: "arrow", label: "Arrow" },
  { id: "text", label: "Text" },
];

const toolIcons: Record<ToolType, string> = {
  select: "⤧",
  pen: "✍",
  eraser: "⌫",
  line: "／",
  rect: "▭",
  ellipse: "◯",
  arrow: "➝",
  text: "T",
};

export const Toolbar = ({ onUndo, onRedo, onExport }: ToolbarProps) => {
  const { activeTool, setActiveTool } = useToolStore();

  return (
    <div className={styles.toolbar}>
      <div className={styles.group}>
        <button onClick={onUndo} aria-label="Undo">
          Undo
        </button>
        <button onClick={onRedo} aria-label="Redo">
          Redo
        </button>
      </div>
      <div className={styles.divider} />
      <div className={styles.group}>
        {tools.map((tool) => (
          <button
            key={tool.id}
            data-active={activeTool === tool.id}
            onClick={() => setActiveTool(tool.id)}
            aria-label={tool.label}
          >
            <span className={styles.icon}>{toolIcons[tool.id]}</span>
            <span className={styles.label}>{tool.label}</span>
          </button>
        ))}
      </div>
      <div className={styles.divider} />
      <div className={styles.group}>
        <button onClick={onExport} aria-label="Export PNG">
          Export
        </button>
      </div>
    </div>
  );
};
