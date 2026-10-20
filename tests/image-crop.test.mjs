import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateImageCrop, imageCropTransform, validateCropImageDimensions } from "../lib/portfolio/image-crop.ts";

const crop = overrides => calculateImageCrop({ width: 1600, height: 1200, rotation: 0, aspectRatio: 16 / 9, zoom: 1, positionX: 0, positionY: 0, ...overrides });
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.000001, `${actual} should equal ${expected}`);

test("a centred landscape crop preserves the requested ratio without stretching", () => {
  const result = crop();
  close(result.width, 1600); close(result.height, 900);
  close(result.x, 0); close(result.y, 150);
  assert.equal(result.outputWidth, 1600); assert.equal(result.outputHeight, 900);
});

test("zoom and edge positions keep the crop inside the rotated image at every quarter turn", () => {
  for (const rotation of [0, 90, 180, 270, -90, 450]) {
    for (const aspectRatio of [16 / 9, 4 / 3, 1, null]) {
      for (const position of [-1, 0, 1]) {
        const result = crop({ rotation, aspectRatio, zoom: 2, positionX: position, positionY: position });
        assert.ok(result.x >= 0 && result.y >= 0);
        assert.ok(result.x + result.width <= result.rotatedWidth + 0.000001);
        assert.ok(result.y + result.height <= result.rotatedHeight + 0.000001);
        if (position === -1) { close(result.x, 0); close(result.y, 0); }
        if (position === 1) { close(result.x + result.width, result.rotatedWidth); close(result.y + result.height, result.rotatedHeight); }
      }
    }
  }
});

test("the canvas transform rotates original pixels clockwise into the same crop coordinates", () => {
  const sourceCorners = [[0, 0], [1600, 0], [1600, 1200], [0, 1200]];
  const expectedByRotation = [
    [[0, 0], [1600, 0], [1600, 1200], [0, 1200]],
    [[1200, 0], [1200, 1600], [0, 1600], [0, 0]],
    [[1600, 1200], [0, 1200], [0, 0], [1600, 0]],
    [[0, 1600], [0, 0], [1200, 0], [1200, 1600]],
  ];
  for (let quarter = 0; quarter < 4; quarter++) {
    const result = crop({ rotation: quarter * 90, aspectRatio: null });
    const [a, b, c, d, e, f] = imageCropTransform(result);
    sourceCorners.forEach(([x, y], index) => {
      close(a * x + c * y + e, expectedByRotation[quarter][index][0]);
      close(b * x + d * y + f, expectedByRotation[quarter][index][1]);
    });
  }
});

test("preview and export framing stays identical and output is capped without upscaling", () => {
  const large = { width: 6000, height: 4000, rotation: 90, zoom: 1.4, positionX: 0.3, positionY: -0.8 };
  const preview = crop({ ...large, maxOutputEdge: 1000 });
  const output = crop(large);
  for (const field of ["x", "y", "width", "height", "rotation"]) close(preview[field], output[field]);
  assert.equal(Math.max(preview.outputWidth, preview.outputHeight), 1000);
  assert.equal(Math.max(output.outputWidth, output.outputHeight), 2000);
  assert.equal(crop({ width: 80, height: 60, aspectRatio: null }).outputWidth, 80);
});

test("the selected crop corners map onto the output bounds after rotation, zoom and positioning", () => {
  for (const rotation of [0, 90, 180, 270]) {
    const result = crop({ rotation, aspectRatio: 4 / 3, zoom: 2.2, positionX: -0.4, positionY: 0.7 });
    const [a, b, c, d, e, f] = imageCropTransform(result);
    const quarter = rotation / 90;
    const cos = [1, 0, -1, 0][quarter];
    const sin = [0, 1, 0, -1][quarter];
    for (const [rx, ry, expectedX, expectedY] of [
      [result.x, result.y, 0, 0],
      [result.x + result.width, result.y + result.height, result.outputWidth, result.outputHeight],
    ]) {
      const centredX = rx - result.rotatedWidth / 2;
      const centredY = ry - result.rotatedHeight / 2;
      const originalX = cos * centredX + sin * centredY + result.sourceWidth / 2;
      const originalY = -sin * centredX + cos * centredY + result.sourceHeight / 2;
      close(a * originalX + c * originalY + e, expectedX);
      close(b * originalX + d * originalY + f, expectedY);
    }
  }
});

test("invalid dimensions, huge decode sizes and non-finite controls are rejected", () => {
  for (const [width, height] of [[0, 1], [NaN, 10], [10.5, 10], [12001, 1], [6000, 4001]]) assert.throws(() => validateCropImageDimensions(width, height));
  for (const overrides of [{ rotation: 45 }, { zoom: Infinity }, { positionX: NaN }, { aspectRatio: 0 }, { maxOutputEdge: 2001 }]) assert.throws(() => crop(overrides));
});
