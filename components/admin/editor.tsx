"use client";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { projectStatuses, skillCategories, statusLabels, type Project, type Skill } from "@/lib/portfolio/types";
import { projectInputSchema, skillInputSchema, validateProjectImage } from "@/lib/portfolio/validation";
import type { z } from "zod";
export type SkillInput = z.infer<typeof skillInputSchema>;
export type ProjectInput = z.infer<typeof projectInputSchema>;

export default function ContentEditor({ section, item, busy, onSave, onCancel }: { section: "skills" | "projects"; item: Skill | Project | null; busy: boolean; onSave: (values: SkillInput | ProjectInput, file: File | null) => Promise<void>; onCancel: () => void }) {
  const skill = item && "name" in item ? item : null; const project = item && "title" in item ? item : null;
  const [values, setValues] = useState({ name: skill?.name || "", category: skill?.category || "technical", level: skill?.level || "", title: project?.title || "", short_description: project?.short_description || "", full_description: project?.full_description || "", technologies: project?.technologies.join(", ") || "", github_url: project?.github_url || "", demo_url: project?.demo_url || "", image_path: project?.image_path || "", status: project?.status || "draft", display_order: String(item?.display_order ?? 0) });
  const [file, setFile] = useState<File | null>(null); const [imagePreview, setImagePreview] = useState(""); const [error, setError] = useState(""); const [replacement, setReplacement] = useState<SkillInput | ProjectInput | null>(null);
  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview); }, [imagePreview]);
  const update = (name: keyof typeof values, value: string) => { setValues(current => ({ ...current, [name]: value })); setError(""); };
  function validate() {
    const result = section === "skills" ? skillInputSchema.safeParse({ name: values.name, category: values.category, level: values.level.trim() || null, display_order: Number(values.display_order) }) : projectInputSchema.safeParse({ title: values.title, short_description: values.short_description, full_description: values.full_description, technologies: values.technologies.split(/[,\n]/).map(item => item.trim()).filter(Boolean), github_url: values.github_url.trim() || null, demo_url: values.demo_url.trim() || null, image_path: values.image_path || null, status: values.status, display_order: Number(values.display_order) });
    if (!result.success) { setError(result.error.issues[0]?.message || "Check the fields and try again."); return null; }
    return result.data;
  }
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (busy) return; const data = validate(); if (!data) return; if (file && project?.image_path) { setReplacement(data); return; } await onSave(data, file); }
  function chooseImage(candidate: File | null) { if (!candidate) { setFile(null); setImagePreview(""); return; } try { validateProjectImage(candidate); const preview = URL.createObjectURL(candidate); setFile(candidate); setImagePreview(preview); setError(""); } catch (error) { setFile(null); setImagePreview(""); setError(error instanceof Error ? error.message : "Choose a valid image."); } }
  const field = (name: keyof typeof values, label: string, options: { required?: boolean; type?: string; maxLength?: number; multiline?: boolean; placeholder?: string } = {}) => <div><label htmlFor={`editor-${name}`}>{label}</label>{options.multiline ? <Textarea id={`editor-${name}`} value={values[name]} onChange={event => update(name, event.target.value)} disabled={busy} required={options.required} maxLength={options.maxLength} rows={3} /> : <Input id={`editor-${name}`} value={values[name]} onChange={event => update(name, event.target.value)} disabled={busy} required={options.required} type={options.type || "text"} maxLength={options.maxLength} placeholder={options.placeholder} min={options.type === "number" ? 0 : undefined} step={options.type === "number" ? 1 : undefined} />}</div>;
  return <><form onSubmit={submit} className="admin-editor-form admin-modal-form">
    {section === "skills" ? <>
      {field("name", "Skill name", { required: true, maxLength: 100 })}
      <div><label id="category-label" htmlFor="skill-category">Category</label><Select value={values.category} onValueChange={value => update("category", value)} disabled={busy}><SelectTrigger id="skill-category" aria-labelledby="category-label" className="w-full h-10"><SelectValue /></SelectTrigger><SelectContent>{skillCategories.map(category => <SelectItem key={category.key} value={category.key}>{category.title}</SelectItem>)}</SelectContent></Select></div>
      {field("level", "Skill level (optional)", { maxLength: 100, placeholder: "For example, Intermediate" })}
      {field("display_order", "Display order", { required: true, type: "number" })}
      <p className="admin-editor-help">Lower order numbers appear first within the category. Skill levels are stored for future use; the public design continues showing skill names.</p>
    </> : <>
      {field("title", "Project title", { required: true, maxLength: 200 })}
      {field("short_description", "Short description", { required: true, maxLength: 1000, multiline: true })}
      {field("full_description", "Full description / key features", { maxLength: 10000, multiline: true })}
      {field("technologies", "Technologies (comma separated)", { maxLength: 3000, placeholder: "Power BI, Python" })}
      <div className="admin-editor-grid">{field("github_url", "GitHub repository URL", { type: "url", maxLength: 2048 })}{field("demo_url", "Live demo URL", { type: "url", maxLength: 2048 })}</div>
      <div className="admin-editor-grid"><div><label id="status-label" htmlFor="project-status">Project status</label><Select value={values.status} onValueChange={value => update("status", value)} disabled={busy}><SelectTrigger id="project-status" aria-labelledby="status-label" className="w-full h-10"><SelectValue /></SelectTrigger><SelectContent>{projectStatuses.map(status => <SelectItem key={status} value={status}>{statusLabels[status]}</SelectItem>)}</SelectContent></Select></div>{field("display_order", "Display order", { required: true, type: "number" })}</div>
      <p className="admin-editor-help">Draft and archived projects are hidden. Not specified, in progress, and completed projects are public. Lower display order numbers appear first.</p>
      <div><label htmlFor="project-image">Project image (optional)</label><Input id="project-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => chooseImage(event.target.files?.[0] || null)} disabled={busy} /><p className="admin-editor-help">JPEG, PNG, or WebP; up to 5 MB. Images are uploaded when you save.{project?.image_path && " A current image is saved. Choosing a file will replace it."}</p>{imagePreview && <img src={imagePreview} className="admin-image-preview" alt="New project image preview" />}</div>
    </>}
    {error && <p className="admin-error admin-modal-error" role="alert">{error}</p>}
    <DialogFooter><Button type="button" variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button><Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />}Save</Button></DialogFooter>
  </form>
  <AlertDialog open={replacement !== null} onOpenChange={open => { if (!open && !busy) setReplacement(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Replace the current project image?</AlertDialogTitle><AlertDialogDescription>Saving will upload the new image, update the project, and delete its previous image from Storage. Cancel keeps your edits open without saving.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><AlertDialogAction onClick={event => { event.preventDefault(); const pending = replacement; setReplacement(null); if (pending) void onSave(pending, file); }}>Save and replace</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}
