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
  auto3dEnabled: boolean;
  setActiveTool: (tool: ToolType) => void;
  setStrokeColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setAuto3dEnabled: (enabled: boolean) => void;
};

export const useToolStore = create<ToolState>((set) => ({
  activeTool: "pen",
  strokeColor: "#2C2926",
  strokeWidth: 2.5,
  auto3dEnabled: false,
  setActiveTool: (tool) => set({ activeTool: tool }),
  setStrokeColor: (color) => set({ strokeColor: color }),
  setStrokeWidth: (width) => set({ strokeWidth: width }),
  setAuto3dEnabled: (enabled) => set({ auto3dEnabled: enabled }),
}));
