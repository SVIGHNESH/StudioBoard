import type { Primitive, TextPrimitive } from "shared/primitives";

export const hitTestText = (primitive: TextPrimitive, x: number, y: number) => {
  return (
    x >= primitive.x &&
    x <= primitive.x + primitive.width &&
    y >= primitive.y &&
    y <= primitive.y + primitive.height
  );
};

export const hitTestPrimitive = (primitive: Primitive, x: number, y: number) => {
  if (primitive.type === "text") {
    const rotation = primitive.rotation ?? 0;
    const cx = primitive.x + primitive.width / 2;
    const cy = primitive.y + primitive.height / 2;
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);
    const dx = x - cx;
    const dy = y - cy;
    const localX = dx * cos - dy * sin + cx;
    const localY = dx * sin + dy * cos + cy;
    return hitTestText(primitive, localX, localY);
  }
  if (primitive.type === "rect") {
    const rotation = primitive.rotation ?? 0;
    const cx = primitive.x + primitive.width / 2;
    const cy = primitive.y + primitive.height / 2;
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);
    const dx = x - cx;
    const dy = y - cy;
    const localX = dx * cos - dy * sin + cx;
    const localY = dx * sin + dy * cos + cy;
    return localX >= primitive.x && localX <= primitive.x + primitive.width && localY >= primitive.y && localY <= primitive.y + primitive.height;
  }
  if (primitive.type === "ellipse") {
    const rotation = primitive.rotation ?? 0;
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);
    const dx = x - primitive.cx;
    const dy = y - primitive.cy;
    const localX = (dx * cos - dy * sin) / primitive.rx;
    const localY = (dx * sin + dy * cos) / primitive.ry;
    return localX * localX + localY * localY <= 1;
  }
  if (primitive.type === "line" || primitive.type === "arrow") {
    const distance = Math.abs(
      (primitive.end.y - primitive.start.y) * x -
        (primitive.end.x - primitive.start.x) * y +
        primitive.end.x * primitive.start.y -
        primitive.end.y * primitive.start.x
    );
    const length = Math.hypot(primitive.end.y - primitive.start.y, primitive.end.x - primitive.start.x);
    return distance / length < 6;
  }
  if (primitive.type === "pen" || primitive.type === "eraser") {
    return primitive.points.some((point) => Math.hypot(point.x - x, point.y - y) < primitive.width * 2);
  }
  return false;
};
