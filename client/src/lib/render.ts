import type { Primitive, StrokePrimitive, TextPrimitive, ImagePrimitive } from "shared/primitives";

const imageCache = new Map<string, HTMLImageElement>();

const getCachedImage = (src: string) => {
  const existing = imageCache.get(src);
  if (existing) return existing;
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = src;
  imageCache.set(src, image);
  return image;
};

const drawStroke = (ctx: CanvasRenderingContext2D, primitive: StrokePrimitive) => {
  if (primitive.points.length < 2) return;
  ctx.strokeStyle = primitive.color;
  ctx.lineWidth = primitive.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(primitive.points[0].x, primitive.points[0].y);
  primitive.points.slice(1).forEach((point) => {
    ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();
};

const drawArrowHead = (
  ctx: CanvasRenderingContext2D,
  start: { x: number; y: number },
  end: { x: number; y: number },
  width: number
) => {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const headLength = Math.max(10, width * 4.2);
  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - headLength * Math.cos(angle - Math.PI / 6),
    end.y - headLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    end.x - headLength * Math.cos(angle + Math.PI / 6),
    end.y - headLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
};

const drawText = (ctx: CanvasRenderingContext2D, primitive: TextPrimitive) => {
  ctx.save();
  ctx.fillStyle = primitive.color;
  ctx.font = `${primitive.fontSize}px ${primitive.fontFamily}`;
  ctx.textAlign = primitive.align;
  ctx.textBaseline = "top";
  const rotation = primitive.rotation ?? 0;
  const cx = primitive.x + primitive.width / 2;
  const cy = primitive.y + primitive.height / 2;
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.fillText(primitive.text, -primitive.width / 2, -primitive.height / 2, primitive.width);
  ctx.restore();
};

const drawImage = (ctx: CanvasRenderingContext2D, primitive: ImagePrimitive) => {
  const image = getCachedImage(primitive.src);
  if (!image.complete) {
    image.onload = () => {
      ctx.canvas.dispatchEvent(new Event("imagereload"));
    };
    image.onerror = () => {
      imageCache.delete(primitive.src);
    };
    return;
  }
  ctx.save();
  const rotation = primitive.rotation ?? 0;
  const cx = primitive.x + primitive.width / 2;
  const cy = primitive.y + primitive.height / 2;
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.drawImage(image, -primitive.width / 2, -primitive.height / 2, primitive.width, primitive.height);
  ctx.restore();
};

export const renderPrimitive = (ctx: CanvasRenderingContext2D, primitive: Primitive) => {
  switch (primitive.type) {
    case "pen":
    case "eraser":
      drawStroke(ctx, primitive);
      break;
    case "line":
      ctx.strokeStyle = primitive.color;
      ctx.lineWidth = primitive.width;
      ctx.beginPath();
      ctx.moveTo(primitive.start.x, primitive.start.y);
      ctx.lineTo(primitive.end.x, primitive.end.y);
      ctx.stroke();
      break;
    case "rect":
      ctx.save();
      ctx.strokeStyle = primitive.stroke;
      ctx.lineWidth = primitive.strokeWidth;
      const rectRotation = primitive.rotation ?? 0;
      const rectCx = primitive.x + primitive.width / 2;
      const rectCy = primitive.y + primitive.height / 2;
      ctx.translate(rectCx, rectCy);
      ctx.rotate(rectRotation);
      if (primitive.fill) {
        ctx.fillStyle = primitive.fill;
        ctx.fillRect(-primitive.width / 2, -primitive.height / 2, primitive.width, primitive.height);
      }
      ctx.strokeRect(-primitive.width / 2, -primitive.height / 2, primitive.width, primitive.height);
      ctx.restore();
      break;
    case "ellipse":
      ctx.save();
      ctx.strokeStyle = primitive.stroke;
      ctx.lineWidth = primitive.strokeWidth;
      ctx.translate(primitive.cx, primitive.cy);
      ctx.rotate(primitive.rotation ?? 0);
      ctx.beginPath();
      ctx.ellipse(0, 0, primitive.rx, primitive.ry, 0, 0, Math.PI * 2);
      if (primitive.fill) {
        ctx.fillStyle = primitive.fill;
        ctx.fill();
      }
      ctx.stroke();
      ctx.restore();
      break;
    case "arrow":
      ctx.strokeStyle = primitive.color;
      ctx.fillStyle = primitive.color;
      ctx.lineWidth = primitive.width;
      ctx.beginPath();
      ctx.moveTo(primitive.start.x, primitive.start.y);
      ctx.lineTo(primitive.end.x, primitive.end.y);
      ctx.stroke();
      drawArrowHead(ctx, primitive.start, primitive.end, primitive.width);
      break;
    case "text":
      drawText(ctx, primitive);
      break;
    case "image":
      drawImage(ctx, primitive);
      break;
    default:
      break;
  }
};

export const renderScene = (
  ctx: CanvasRenderingContext2D,
  primitives: Primitive[],
  transform: { scale: number; offsetX: number; offsetY: number },
  pixelRatio = 1
) => {
  ctx.save();
  const scale = transform.scale * pixelRatio;
  ctx.setTransform(scale, 0, 0, scale, transform.offsetX * pixelRatio, transform.offsetY * pixelRatio);
  primitives.forEach((primitive) => renderPrimitive(ctx, primitive));
  ctx.restore();
};
