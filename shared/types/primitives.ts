export type PrimitiveType =
  | "pen"
  | "eraser"
  | "line"
  | "rect"
  | "ellipse"
  | "arrow"
  | "text";

export type Point = {
  x: number;
  y: number;
  pressure?: number;
};

export type StrokePrimitive = {
  id: string;
  type: "pen" | "eraser";
  points: Point[];
  color: string;
  width: number;
  createdBy: string;
};

export type LinePrimitive = {
  id: string;
  type: "line";
  start: Point;
  end: Point;
  color: string;
  width: number;
  createdBy: string;
};

export type RectPrimitive = {
  id: string;
  type: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
  stroke: string;
  strokeWidth: number;
  fill?: string;
  rotation?: number;
  createdBy: string;
};

export type EllipsePrimitive = {
  id: string;
  type: "ellipse";
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  stroke: string;
  strokeWidth: number;
  fill?: string;
  rotation?: number;
  createdBy: string;
};

export type ArrowPrimitive = {
  id: string;
  type: "arrow";
  start: Point;
  end: Point;
  color: string;
  width: number;
  createdBy: string;
};

export type TextPrimitive = {
  id: string;
  type: "text";
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  align: "left" | "center" | "right";
  rotation?: number;
  createdBy: string;
};

export type Primitive =
  | StrokePrimitive
  | LinePrimitive
  | RectPrimitive
  | EllipsePrimitive
  | ArrowPrimitive
  | TextPrimitive;
