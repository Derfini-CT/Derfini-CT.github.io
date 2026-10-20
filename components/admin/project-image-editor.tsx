"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2, RotateCcw, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calculateImageCrop, imageCropTransform, validateCropImageDimensions, type ImageCropGeometry } from "@/lib/portfolio/image-crop";

export type ProjectImageEditorProps = {
  source: string;
  sourceName?: string;
  disabled?: boolean;
  onApply: (file: File) => void;
  onCancel: () => void;
};

const ratios = [
  { value: "16:9", label: "16:9", ratio: 16 / 9 },
  { value: "4:3", label: "4:3", ratio: 4 / 3 },
  { value: "1:1", label: "Square", ratio: 1 },
  { value: "original", label: "Original", ratio: null },
] as const;

function paintCrop(canvas: HTMLCanvasElement, image: HTMLImageElement, crop: ImageCropGeometry) {
  canvas.width = crop.outputWidth;
  canvas.height = crop.outputHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not open the image editor. Try another browser.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.setTransform(...imageCropTransform(crop));
  context.drawImage(image, 0, 0);
}

const encodeJpeg = (canvas: HTMLCanvasElement, quality: number) => new Promise<Blob>((resolve, reject) => {
  canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("The crop could not be created. Try a smaller crop or a different image.")), "image/jpeg", quality);
});

export default function ProjectImageEditor(props: ProjectImageEditorProps) {
  // Changing the source starts a fresh editing session without retaining another image's crop.
  return <ProjectImageEditorSession key={props.source} {...props} />;
}

function ProjectImageEditorSession({ source, sourceName, disabled = false, onApply, onCancel }: ProjectImageEditorProps) {
  const id = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(true);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [paintedVersion, setPaintedVersion] = useState("");
  const [previewAttempt, setPreviewAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [ratio, setRatio] = useState<(typeof ratios)[number]["value"]>("16:9");
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [positionX, setPositionX] = useState(0);
  const [positionY, setPositionY] = useState(0);
  const blocked = disabled || busy;
  const selectedRatio = ratios.find(option => option.value === ratio) ?? ratios[0];
  const geometry = image ? calculateImageCrop({ width: image.naturalWidth, height: image.naturalHeight, rotation, aspectRatio: selectedRatio.ratio, zoom, positionX, positionY }) : null;
  const previewVersion = `${rotation}:${ratio}:${zoom}:${positionX}:${positionY}:${previewAttempt}`;
  const previewReady = image !== null && paintedVersion === previewVersion && !previewError;

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true });
      headingRef.current?.scrollIntoView({ block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let active = true;
    activeRef.current = true;
    const candidate = new Image();
    candidate.crossOrigin = "anonymous";
    candidate.decoding = "async";
    candidate.onload = () => {
      if (!active) return;
      try { validateCropImageDimensions(candidate.naturalWidth, candidate.naturalHeight); setImage(candidate); }
      catch (cause) { setError(cause instanceof Error ? cause.message : "This image cannot be edited."); }
    };
    candidate.onerror = () => {
      if (active) setError("The image could not be loaded for editing. Upload the original JPEG, PNG, or WebP file and try again.");
    };
    candidate.src = source;
    return () => { active = false; activeRef.current = false; candidate.onload = null; candidate.onerror = null; };
  }, [source]);

  useEffect(() => {
    if (!image || !previewRef.current) return;
    const crop = calculateImageCrop({ width: image.naturalWidth, height: image.naturalHeight, rotation, aspectRatio: selectedRatio.ratio, zoom, positionX, positionY, maxOutputEdge: 1000 });
    const frame = requestAnimationFrame(() => {
      if (!previewRef.current) return;
      try {
        paintCrop(previewRef.current, image, crop);
        setPaintedVersion(previewVersion);
        setPreviewError("");
      } catch (cause) {
        setPaintedVersion("");
        setPreviewError(cause instanceof Error ? cause.message : "The image preview could not be displayed. Reset the crop and try again.");
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [image, rotation, selectedRatio.ratio, zoom, positionX, positionY, previewVersion]);

  function reset() {
    setRatio("16:9"); setRotation(0); setZoom(1); setPositionX(0); setPositionY(0); setError(""); setPreviewAttempt(current => current + 1);
  }

  async function apply() {
    if (!image || !geometry || blocked || !previewReady) return;
    setBusy(true); setError("");
    try {
      const canvas = document.createElement("canvas");
      paintCrop(canvas, image, geometry);
      let blob = await encodeJpeg(canvas, 0.92);
      if (blob.size > 5 * 1024 * 1024) blob = await encodeJpeg(canvas, 0.8);
      if (blob.size > 5 * 1024 * 1024) throw new Error("The cropped image is larger than 5 MB. Zoom in further and try again.");
      if (!activeRef.current) return;
      const baseName = (sourceName || "project-image").replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80) || "project-image";
      onApply(new File([blob], `${baseName}-cropped.jpg`, { type: "image/jpeg", lastModified: Date.now() }));
    } catch (cause) {
      if (activeRef.current) setError(cause instanceof Error ? cause.message : "The crop could not be created. Please try again.");
    } finally {
      if (activeRef.current) setBusy(false);
    }
  }

  return <section className="admin-crop-editor" aria-labelledby={`${id}-title`} aria-busy={busy}>
    <div className="admin-crop-header"><h3 ref={headingRef} tabIndex={-1} id={`${id}-title`}>Crop and edit image</h3><p className="admin-editor-help">Zoom, rotate, or frame the image. Cancel crop keeps your selected image unchanged. Public cards adapt to the screen and may trim the saved crop’s edges.</p></div>
    <div className="admin-crop-preview" style={{ aspectRatio: geometry ? `${geometry.outputWidth} / ${geometry.outputHeight}` : "16 / 9" }}>
      {!image && !error && <p className="admin-crop-loading" role="status"><Loader2 className="animate-spin" aria-hidden="true" />Loading image…</p>}
      <canvas ref={previewRef} aria-label="Project image crop preview" role="img" hidden={!image} style={{ display: image ? "block" : "none", width: "100%", height: "100%", objectFit: "contain" }} />
    </div>
    <fieldset className="admin-crop-controls" disabled={blocked || !image}>
      <legend>Crop controls</legend>
      <div className="admin-crop-field"><label htmlFor={`${id}-ratio`}>Aspect ratio</label><select id={`${id}-ratio`} value={ratio} onChange={event => { setRatio(event.target.value as typeof ratio); setPositionX(0); setPositionY(0); }}>{ratios.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select><p className="admin-editor-help">16:9 is a useful starting point for landscape images. Choose Original to keep the image’s proportions.</p></div>
      <div className="admin-crop-field"><label htmlFor={`${id}-zoom`}>Zoom <output htmlFor={`${id}-zoom`}>{zoom.toFixed(2)}×</output></label><input id={`${id}-zoom`} type="range" min="1" max="3" step="0.01" value={zoom} onChange={event => setZoom(Number(event.target.value))} /></div>
      <div className="admin-crop-field"><label htmlFor={`${id}-horizontal`}>Horizontal position <output htmlFor={`${id}-horizontal`}>{Math.round((positionX + 1) * 50)}%</output></label><input id={`${id}-horizontal`} type="range" min="-1" max="1" step="0.01" value={positionX} onChange={event => setPositionX(Number(event.target.value))} disabled={blocked || !image || (geometry !== null && Math.abs(geometry.rotatedWidth - geometry.width) < 0.01)} /></div>
      <div className="admin-crop-field"><label htmlFor={`${id}-vertical`}>Vertical position <output htmlFor={`${id}-vertical`}>{Math.round((positionY + 1) * 50)}%</output></label><input id={`${id}-vertical`} type="range" min="-1" max="1" step="0.01" value={positionY} onChange={event => setPositionY(Number(event.target.value))} disabled={blocked || !image || (geometry !== null && Math.abs(geometry.rotatedHeight - geometry.height) < 0.01)} /></div>
      <div className="admin-crop-tools"><Button type="button" variant="outline" onClick={() => { setRotation(current => (current + 90) % 360); setPositionX(0); setPositionY(0); }}><RotateCw aria-hidden="true" />Rotate 90°</Button><Button type="button" variant="outline" onClick={reset}><RotateCcw aria-hidden="true" />Reset</Button></div>
    </fieldset>
    {geometry && <p className="admin-editor-help">Crop output: {geometry.outputWidth} × {geometry.outputHeight} pixels. Saved as JPEG; transparent areas become white. Apply crop prepares the image. Save the project to publish it.</p>}
    {previewError && <p className="admin-error admin-crop-error" role="alert">{previewError}</p>}
    {error && <p className="admin-error admin-crop-error" role="alert">{error}</p>}
    <div className="admin-crop-actions"><Button type="button" variant="outline" disabled={blocked} onClick={onCancel}>Cancel crop</Button><Button type="button" disabled={blocked || !previewReady} onClick={() => void apply()}>{busy && <Loader2 className="animate-spin" aria-hidden="true" />}Apply crop</Button></div>
  </section>;
}
