// Browser-only helpers: the create-post modal compresses photos before upload
// so originals of dozens of MB never reach the private bucket.

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_PHOTOS = 2;

const MAX_PHOTO_DIMENSION = 1600;
const PHOTO_QUALITY = 0.85;

export type PhotoMimeType = "image/jpeg" | "image/png" | "image/webp";

const SUPPORTED_MIME_TYPES: readonly PhotoMimeType[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export interface CompressedPhoto {
  blob: Blob;
  contentType: "image/webp" | "image/jpeg";
  extension: "webp" | "jpg";
  width: number;
  height: number;
}

export type PhotoErrorCode =
  | "too_large"
  | "unsupported_type"
  | "decode_failed"
  | "encode_failed"
  | "too_large_after_compression";

export class PhotoError extends Error {
  constructor(readonly code: PhotoErrorCode) {
    super(code);
    this.name = "PhotoError";
  }
}

function isSupportedMimeType(type: string): type is PhotoMimeType {
  return SUPPORTED_MIME_TYPES.includes(type as PhotoMimeType);
}

type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;

function createCanvas(width: number, height: number): AnyCanvas {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

async function encodeCanvas(
  canvas: AnyCanvas,
  type: "image/webp" | "image/jpeg",
): Promise<Blob | null> {
  if ("convertToBlob" in canvas) {
    return canvas.convertToBlob({ type, quality: PHOTO_QUALITY });
  }

  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, PHOTO_QUALITY);
  });
}

export async function compressPhoto(file: File): Promise<CompressedPhoto> {
  if (file.size > MAX_PHOTO_BYTES) {
    throw new PhotoError("too_large");
  }

  if (!isSupportedMimeType(file.type)) {
    throw new PhotoError("unsupported_type");
  }

  let bitmap: ImageBitmap;

  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new PhotoError("decode_failed");
  }

  try {
    const largestSide = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, MAX_PHOTO_DIMENSION / largestSide);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");

    if (!context) {
      throw new PhotoError("encode_failed");
    }

    // A PNG with transparency would turn black if the browser falls back to
    // JPEG, so the canvas starts with a white background.
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);

    let blob = await encodeCanvas(canvas, "image/webp");
    let contentType: CompressedPhoto["contentType"] = "image/webp";
    let extension: CompressedPhoto["extension"] = "webp";

    if (!blob || blob.type !== "image/webp") {
      // Browsers without WebP encoding silently return PNG; re-encode as JPEG.
      blob = await encodeCanvas(canvas, "image/jpeg");
      contentType = "image/jpeg";
      extension = "jpg";
    }

    if (!blob) {
      throw new PhotoError("encode_failed");
    }

    if (blob.size > MAX_PHOTO_BYTES) {
      throw new PhotoError("too_large_after_compression");
    }

    return { blob, contentType, extension, width, height };
  } finally {
    bitmap.close();
  }
}
