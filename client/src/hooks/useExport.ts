import { useCallback } from "react";
import type { Primitive } from "shared/primitives";
import { renderScene } from "../lib/render";

const getBounds = (primitives: Primitive[]) => {
  if (primitives.length === 0) {
    return { minX: 0, minY: 0, maxX: 1000, maxY: 700 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  primitives.forEach((primitive) => {
    switch (primitive.type) {
      case "pen":
      case "eraser":
        primitive.points.forEach((point) => {
          minX = Math.min(minX, point.x);
          minY = Math.min(minY, point.y);
          maxX = Math.max(maxX, point.x);
          maxY = Math.max(maxY, point.y);
        });
        break;
      case "line":
      case "arrow":
        minX = Math.min(minX, primitive.start.x, primitive.end.x);
        minY = Math.min(minY, primitive.start.y, primitive.end.y);
        maxX = Math.max(maxX, primitive.start.x, primitive.end.x);
        maxY = Math.max(maxY, primitive.start.y, primitive.end.y);
        break;
      case "rect":
        minX = Math.min(minX, primitive.x);
        minY = Math.min(minY, primitive.y);
        maxX = Math.max(maxX, primitive.x + primitive.width);
        maxY = Math.max(maxY, primitive.y + primitive.height);
        break;
      case "ellipse":
        minX = Math.min(minX, primitive.cx - primitive.rx);
        minY = Math.min(minY, primitive.cy - primitive.ry);
        maxX = Math.max(maxX, primitive.cx + primitive.rx);
        maxY = Math.max(maxY, primitive.cy + primitive.ry);
        break;
      case "text":
        minX = Math.min(minX, primitive.x);
        minY = Math.min(minY, primitive.y);
        maxX = Math.max(maxX, primitive.x + primitive.width);
        maxY = Math.max(maxY, primitive.y + primitive.height);
        break;
      default:
        break;
    }
  });

  return { minX, minY, maxX, maxY };
};

export const useExport = () => {
  return useCallback((primitives: Primitive[], withGrid: boolean) => {
    const bounds = getBounds(primitives);
    const padding = 40;
    const width = Math.max(1, bounds.maxX - bounds.minX + padding * 2);
    const height = Math.max(1, bounds.maxY - bounds.minY + padding * 2);
    const scale = 2;

    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = "#F7F5F2";
    ctx.fillRect(0, 0, width, height);

    if (withGrid) {
      ctx.strokeStyle = "#E8E4DF";
      ctx.lineWidth = 1;
      const minor = 20;
      const major = 100;
      for (let x = 0; x < width; x += minor) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += minor) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.strokeStyle = "#D9D4CD";
      for (let x = 0; x < width; x += major) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += major) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    renderScene(ctx, primitives, {
      scale: 1,
      offsetX: -bounds.minX + padding,
      offsetY: -bounds.minY + padding,
    });

    canvas.toBlob((blob) => {
      if (!blob) return;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "studio-board.png";
      link.click();
      URL.revokeObjectURL(link.href);
    });
  }, []);
};
