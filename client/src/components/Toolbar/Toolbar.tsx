import styles from "./Toolbar.module.css";
import { useToolStore } from "../../stores/toolStore";
import type { ToolType } from "../../stores/toolStore";

type ToolbarProps = {
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  onUploadImage: (file: File) => void;
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

export const Toolbar = ({ onUndo, onRedo, onExport, onUploadImage }: ToolbarProps) => {
  const { activeTool, setActiveTool, strokeColor, setStrokeColor } = useToolStore();
  const colors = ["#2C2926", "#E85D3D", "#1976D2", "#2E7D32", "#F6B24B", "#7B1FA2", "#6D4C41", "#00897B"];
  const isCustomColor = !colors.includes(strokeColor);

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
      <div className={styles.group} aria-label="Colors">
        {colors.map((color) => (
          <button
            key={color}
            className={styles.color}
            data-active={strokeColor === color}
            onClick={() => setStrokeColor(color)}
            aria-label={`Set color ${color}`}
            style={{ backgroundColor: color }}
          />
        ))}
        <label
          className={styles.colorPicker}
          data-active={isCustomColor}
          aria-label="Custom color"
        >
          <input
            type="color"
            value={strokeColor}
            onChange={(event) => setStrokeColor(event.target.value)}
            aria-label="Choose custom color"
          />
        </label>
      </div>
      <div className={styles.divider} />
      <div className={styles.group}>
        <button onClick={onExport} aria-label="Export PNG">
          Export
        </button>
        <label className={styles.upload} aria-label="Upload image">
          <span className={styles.icon}>🖼</span>
          <span className={styles.label}>Image</span>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              onUploadImage(file);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>
    </div>
  );
};
