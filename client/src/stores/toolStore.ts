import { create } from "zustand";

export type ToolType =
  | "select"
  | "pen"
  | "eraser"
  | "line"
  | "rect"
  | "ellipse"
  | "arrow"
  | "text";

type ToolState = {
  activeTool: ToolType;
  strokeColor: string;
  strokeWidth: number;
  setActiveTool: (tool: ToolType) => void;
  setStrokeColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
};

export const useToolStore = create<ToolState>((set) => ({
  activeTool: "pen",
  strokeColor: "#2C2926",
  strokeWidth: 2.5,
  setActiveTool: (tool) => set({ activeTool: tool }),
  setStrokeColor: (color) => set({ strokeColor: color }),
  setStrokeWidth: (width) => set({ strokeWidth: width }),
}));
