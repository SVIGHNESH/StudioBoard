import type { ToolType } from "../stores/toolStore";

export const toolKeyMap: Record<string, ToolType> = {
  v: "select",
  p: "pen",
  e: "eraser",
  l: "line",
  r: "rect",
  o: "ellipse",
  a: "arrow",
  t: "text",
};
