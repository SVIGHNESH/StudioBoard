type UploadResult = {
  url: string;
  width: number;
  height: number;
};

const MAX_BYTES = 1024 * 1024;
const MAX_DIMENSION = 2048;

const loadImage = (blob: Blob) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Unable to load image"));
    img.src = URL.createObjectURL(blob);
  });

const detectTransparency = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const data = ctx.getImageData(0, 0, width, height).data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }
  return false;
};

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Unable to encode image"));
          return;
        }
        resolve(blob);
      },
      type,
      quality
    );
  });

const downscaleImage = async (file: File) => {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed");
  }

  let sourceBlob: Blob = file;
  let image = await loadImage(sourceBlob);

  let scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
  let width = Math.max(1, Math.round(image.naturalWidth * scale));
  let height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");

  const renderToCanvas = () => {
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
  };

  renderToCanvas();
  const preservePng = detectTransparency(ctx, width, height);
  const outputType = preservePng ? "image/png" : "image/jpeg";

  let quality = 0.92;
  let blob = await canvasToBlob(canvas, outputType, preservePng ? undefined : quality);

  while (blob.size > MAX_BYTES && quality > 0.4) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, outputType, preservePng ? undefined : quality);
  }

  while (blob.size > MAX_BYTES) {
    scale *= 0.85;
    width = Math.max(1, Math.round(image.naturalWidth * scale));
    height = Math.max(1, Math.round(image.naturalHeight * scale));
    renderToCanvas();
    quality = preservePng ? quality : Math.max(0.7, quality);
    blob = await canvasToBlob(canvas, outputType, preservePng ? undefined : quality);
    if (width <= 32 || height <= 32) break;
  }

  if (blob.size > MAX_BYTES) {
    throw new Error("Image is too large after compression");
  }

  URL.revokeObjectURL(image.src);
  image = await loadImage(blob);

  return { blob, width: image.naturalWidth, height: image.naturalHeight };
};

export const uploadImage = async (file: File, serverUrl: string): Promise<UploadResult> => {
  const { blob, width, height } = await downscaleImage(file);
  if (blob.size > MAX_BYTES) {
    throw new Error("Image must be under 1MB");
  }

  const formData = new FormData();
  const extension = blob.type === "image/png" ? "png" : "jpg";
  formData.append("file", blob, `upload.${extension}`);

  const response = await fetch(`${serverUrl}/uploads`, {
    method: "POST",
    body: formData,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.url) {
    const detail = data?.error ? ` - ${data.error}` : "";
    throw new Error(`Upload failed${detail}`);
  }

  const rawUrl = data.url as string;
  const base = serverUrl.endsWith("/") ? serverUrl.slice(0, -1) : serverUrl;
  const resolvedUrl = rawUrl.startsWith("http") ? rawUrl : `${base}${rawUrl}`;

  return {
    url: resolvedUrl,
    width,
    height,
  };
};
