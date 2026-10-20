export type ImageCropOptions = {
  width: number;
  height: number;
  rotation: number;
  aspectRatio: number | null;
  zoom: number;
  positionX: number;
  positionY: number;
  maxOutputEdge?: number;
};

export type ImageCropGeometry = {
  sourceWidth: number;
  sourceHeight: number;
  rotation: number;
  rotatedWidth: number;
  rotatedHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
  outputWidth: number;
  outputHeight: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function validateCropImageDimensions(width: number, height: number) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error("This image has invalid dimensions. Choose another JPEG, PNG, or WebP image.");
  }
  if (width > 12000 || height > 12000 || width * height > 24_000_000) {
    throw new Error("This image is too large to edit safely. Resize it to 24 megapixels or less, with neither side over 12,000 pixels.");
  }
}

/** Coordinates refer to the rotated image, so the preview and exported crop use identical framing. */
export function calculateImageCrop(options: ImageCropOptions): ImageCropGeometry {
  validateCropImageDimensions(options.width, options.height);
  if (!Number.isInteger(options.rotation) || options.rotation % 90 !== 0) throw new Error("Rotation must use 90 degree steps.");
  if (![options.zoom, options.positionX, options.positionY].every(Number.isFinite)) throw new Error("Crop controls must be finite numbers.");
  if (options.aspectRatio !== null && (!Number.isFinite(options.aspectRatio) || options.aspectRatio <= 0)) throw new Error("Choose a valid crop ratio.");
  const maxOutputEdge = options.maxOutputEdge ?? 2000;
  if (!Number.isFinite(maxOutputEdge) || maxOutputEdge < 1 || maxOutputEdge > 2000) throw new Error("The output size must be between 1 and 2,000 pixels.");
  const rotation = ((options.rotation % 360) + 360) % 360;
  const sideways = rotation === 90 || rotation === 270;
  const rotatedWidth = sideways ? options.height : options.width;
  const rotatedHeight = sideways ? options.width : options.height;
  const ratio = options.aspectRatio ?? rotatedWidth / rotatedHeight;
  const zoom = clamp(options.zoom, 1, 3);
  const width = Math.min(rotatedWidth, rotatedHeight * ratio) / zoom;
  const height = width / ratio;
  const x = (rotatedWidth - width) * (clamp(options.positionX, -1, 1) + 1) / 2;
  const y = (rotatedHeight - height) * (clamp(options.positionY, -1, 1) + 1) / 2;
  const scale = Math.min(1, maxOutputEdge / Math.max(width, height));
  return {
    sourceWidth: options.width, sourceHeight: options.height,
    rotation, rotatedWidth, rotatedHeight, x, y, width, height,
    outputWidth: Math.max(1, Math.round(width * scale)),
    outputHeight: Math.max(1, Math.round(height * scale)),
  };
}

/** Maps original pixels directly onto the output canvas without allocating a full rotated bitmap. */
export function imageCropTransform(crop: ImageCropGeometry): [number, number, number, number, number, number] {
  const quarter = crop.rotation / 90;
  const cos = [1, 0, -1, 0][quarter];
  const sin = [0, 1, 0, -1][quarter];
  const scaleX = crop.outputWidth / crop.width;
  const scaleY = crop.outputHeight / crop.height;
  return [
    cos * scaleX, sin * scaleY, -sin * scaleX, cos * scaleY,
    (crop.rotatedWidth / 2 - cos * crop.sourceWidth / 2 + sin * crop.sourceHeight / 2 - crop.x) * scaleX,
    (crop.rotatedHeight / 2 - sin * crop.sourceWidth / 2 - cos * crop.sourceHeight / 2 - crop.y) * scaleY,
  ];
}
