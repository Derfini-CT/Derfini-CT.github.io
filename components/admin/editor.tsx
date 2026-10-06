"use client";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { projectStatuses, skillCategories, statusLabels, type Achievement, type Certification, type Experience, type Project, type Skill } from "@/lib/portfolio/types";
import { achievementInputSchema, certificationInputSchema, experienceInputSchema, projectInputSchema, skillInputSchema, validateProjectImage } from "@/lib/portfolio/validation";
import type { z } from "zod";
export type SkillInput = z.infer<typeof skillInputSchema>;
export type ProjectInput = z.infer<typeof projectInputSchema>;
export type CertificationInput = z.infer<typeof certificationInputSchema>;
export type ExperienceInput = z.infer<typeof experienceInputSchema>;
export type AchievementInput = z.infer<typeof achievementInputSchema>;
export type ContentInput = SkillInput | ProjectInput | CertificationInput | ExperienceInput | AchievementInput;
export type ContentSection = "skills" | "projects" | "certifications" | "experience" | "achievements";
export type ContentRow = Skill | Project | Certification | Experience | Achievement;

type FieldOptions = { required?: boolean; type?: string; maxLength?: number; multiline?: boolean; placeholder?: string; help?: string };
const list = (value: string) => value.split(/[,\n]/).map(item => item.trim()).filter(Boolean);
const orNull = (value: string) => value.trim() || null;

export default function ContentEditor({ section, item, busy, onSave, onCancel }: { section: ContentSection; item: ContentRow | null; busy: boolean; onSave: (values: ContentInput, file: File | null) => Promise<void>; onCancel: () => void }) {
  // Every section's columns live in one flat form state; each section reads only its own.
  const row = (item ?? {}) as Partial<Skill & Project & Certification & Experience & Achievement>;
  const [values, setValues] = useState({
    name: row.name || "", category: row.category || "technical", level: row.level || "",
    title: row.title || "", short_description: row.short_description || "", full_description: row.full_description || "",
    technologies: row.technologies?.join(", ") || "", github_url: row.github_url || "", demo_url: row.demo_url || "", image_path: row.image_path || "", status: row.status || "draft",
    issuer: row.issuer || "", description: row.description || "", credential_url: row.credential_url || "", issued_on: row.issued_on || "", score: row.score === null || row.score === undefined ? "" : String(row.score), recognition: row.recognition || "",
    organization: row.organization || "", started_on: row.started_on || "", ended_on: row.ended_on || "",
    event_name: row.event_name || "", achieved_on: row.achieved_on || "", evidence_url: row.evidence_url || "",
    display_order: String(row.display_order ?? 0),
  });
  const project = section === "projects" && item ? item as Project : null;
  const [file, setFile] = useState<File | null>(null); const [imagePreview, setImagePreview] = useState(""); const [error, setError] = useState(""); const [replacement, setReplacement] = useState<ContentInput | null>(null);
  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview); }, [imagePreview]);
  const update = (name: keyof typeof values, value: string) => { setValues(current => ({ ...current, [name]: value })); setError(""); };

  function parse() {
    const order = Number(values.display_order);
    switch (section) {
      case "skills": return skillInputSchema.safeParse({ name: values.name, category: values.category, level: orNull(values.level), display_order: order });
      case "projects": return projectInputSchema.safeParse({ title: values.title, short_description: values.short_description, full_description: values.full_description, technologies: list(values.technologies), github_url: orNull(values.github_url), demo_url: orNull(values.demo_url), image_path: values.image_path || null, status: values.status, display_order: order });
      case "certifications": return certificationInputSchema.safeParse({ title: values.title, issuer: orNull(values.issuer), description: values.description, credential_url: orNull(values.credential_url), issued_on: values.issued_on || null, score: values.score.trim() === "" ? null : Number(values.score), recognition: orNull(values.recognition), display_order: order });
      case "experience": return experienceInputSchema.safeParse({ title: values.title, organization: orNull(values.organization), description: values.description, technologies: list(values.technologies), started_on: values.started_on || null, ended_on: values.ended_on || null, display_order: order });
      case "achievements": return achievementInputSchema.safeParse({ title: values.title, description: values.description, event_name: orNull(values.event_name), recognition: orNull(values.recognition), achieved_on: values.achieved_on || null, evidence_url: orNull(values.evidence_url), display_order: order });
    }
  }
  function validate() {
    const result = parse();
    if (!result.success) { setError(result.error.issues[0]?.message || "Check the fields and try again."); return null; }
    return result.data as ContentInput;
  }
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (busy) return; const data = validate(); if (!data) return; if (file && project?.image_path) { setReplacement(data); return; } await onSave(data, file); }
  function chooseImage(candidate: File | null) { if (!candidate) { setFile(null); setImagePreview(""); return; } try { validateProjectImage(candidate); const preview = URL.createObjectURL(candidate); setFile(candidate); setImagePreview(preview); setError(""); } catch (error) { setFile(null); setImagePreview(""); setError(error instanceof Error ? error.message : "Choose a valid image."); } }

  const field = (name: keyof typeof values, label: string, options: FieldOptions = {}) => <div><label htmlFor={`editor-${name}`}>{label}</label>{options.multiline ? <Textarea id={`editor-${name}`} value={values[name]} onChange={event => update(name, event.target.value)} disabled={busy} required={options.required} maxLength={options.maxLength} rows={3} placeholder={options.placeholder} /> : <Input id={`editor-${name}`} value={values[name]} onChange={event => update(name, event.target.value)} disabled={busy} required={options.required} type={options.type || "text"} maxLength={options.maxLength} placeholder={options.placeholder} min={options.type === "number" ? 0 : undefined} max={name === "score" ? 100 : undefined} step={name === "score" ? 0.01 : options.type === "number" ? 1 : undefined} />}{options.help && <p className="admin-editor-help">{options.help}</p>}</div>;
  const order = field("display_order", "Display order", { required: true, type: "number", help: "Lower numbers appear first." });

  return <><form onSubmit={submit} className="admin-editor-form admin-modal-form">
    {section === "skills" && <>
      {field("name", "Skill name", { required: true, maxLength: 100 })}
      <div><label id="category-label" htmlFor="skill-category">Category</label><Select value={values.category} onValueChange={value => update("category", value)} disabled={busy}><SelectTrigger id="skill-category" aria-labelledby="category-label" className="w-full h-10"><SelectValue /></SelectTrigger><SelectContent>{skillCategories.map(category => <SelectItem key={category.key} value={category.key}>{category.title}</SelectItem>)}</SelectContent></Select><p className="admin-editor-help">Group headings and descriptions are edited under Site content.</p></div>
      {field("level", "Skill level (optional)", { maxLength: 100, placeholder: "For example, Intermediate" })}
      {order}
      <p className="admin-editor-help">Skill levels are stored for future use; the public design shows skill names.</p>
    </>}
    {section === "projects" && <>
      {field("title", "Project title", { required: true, maxLength: 200 })}
      {field("short_description", "Short description", { required: true, maxLength: 1000, multiline: true })}
      {field("full_description", "Full description / key features", { maxLength: 10000, multiline: true })}
      {field("technologies", "Technologies (comma separated)", { maxLength: 3000, placeholder: "Power BI, Python" })}
      <div className="admin-editor-grid">{field("github_url", "GitHub repository URL", { type: "url", maxLength: 2048 })}{field("demo_url", "Live demo URL", { type: "url", maxLength: 2048 })}</div>
      <div className="admin-editor-grid"><div><label id="status-label" htmlFor="project-status">Project status</label><Select value={values.status} onValueChange={value => update("status", value)} disabled={busy}><SelectTrigger id="project-status" aria-labelledby="status-label" className="w-full h-10"><SelectValue /></SelectTrigger><SelectContent>{projectStatuses.map(status => <SelectItem key={status} value={status}>{statusLabels[status]}</SelectItem>)}</SelectContent></Select></div>{order}</div>
      <p className="admin-editor-help">Draft and archived projects are hidden. Not specified, in progress, and completed projects are public.</p>
      <div><label htmlFor="project-image">Project image (optional)</label><Input id="project-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => chooseImage(event.target.files?.[0] || null)} disabled={busy} /><p className="admin-editor-help">JPEG, PNG, or WebP; up to 5 MB. Images are uploaded when you save.{project?.image_path && " A current image is saved. Choosing a file will replace it."}</p>{imagePreview && <img src={imagePreview} className="admin-image-preview" alt="New project image preview" />}</div>
    </>}
    {section === "certifications" && <>
      {field("title", "Certification title", { required: true, maxLength: 200 })}
      {field("issuer", "Issuer", { maxLength: 200, placeholder: "For example, NPTEL · IIT Kharagpur" })}
      {field("description", "Description", { maxLength: 10000, multiline: true, help: "Left empty, the page shows the completion month instead." })}
      <div className="admin-editor-grid">{field("score", "Course score (%)", { type: "number", help: "Fills the round gauge. Leave empty to show a badge icon." })}{field("recognition", "Recognition badge", { maxLength: 100, placeholder: "For example, Elite" })}</div>
      <div className="admin-editor-grid">{field("issued_on", "Issued on", { type: "date" })}{order}</div>
      {field("credential_url", "Certificate link", { type: "url", maxLength: 2048, help: "Adds a Certificate button when set." })}
    </>}
    {section === "experience" && <>
      {field("title", "Role title", { required: true, maxLength: 200, help: "A title containing “embedded” or “analytics” picks the card’s colour and icon." })}
      {field("organization", "Organization", { maxLength: 200 })}
      {field("description", "What you did", { maxLength: 10000, multiline: true })}
      {field("technologies", "Technologies (comma separated)", { maxLength: 3000, placeholder: "Arduino, C" })}
      <div className="admin-editor-grid">{field("started_on", "Started", { type: "date" })}{field("ended_on", "Ended", { type: "date", help: "Leave empty while it is ongoing." })}</div>
      {order}
    </>}
    {section === "achievements" && <>
      {field("title", "Achievement title", { required: true, maxLength: 200 })}
      {field("description", "Description", { maxLength: 10000, multiline: true })}
      <div className="admin-editor-grid">{field("recognition", "Highlight label", { maxLength: 100, placeholder: "For example, First place", help: "Shown in gold above the title." })}{field("event_name", "Event", { maxLength: 200 })}</div>
      <div className="admin-editor-grid">{field("achieved_on", "Date", { type: "date" })}{order}</div>
      {field("evidence_url", "Details link", { type: "url", maxLength: 2048, help: "Adds a View details link when set." })}
    </>}
    {error && <p className="admin-error admin-modal-error" role="alert">{error}</p>}
    <DialogFooter><Button type="button" variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button><Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />}Save</Button></DialogFooter>
  </form>
  <AlertDialog open={replacement !== null} onOpenChange={open => { if (!open && !busy) setReplacement(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Replace the current project image?</AlertDialogTitle><AlertDialogDescription>Saving will upload the new image, update the project, and delete its previous image from Storage. Cancel keeps your edits open without saving.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><AlertDialogAction onClick={event => { event.preventDefault(); const pending = replacement; setReplacement(null); if (pending) void onSave(pending, file); }}>Save and replace</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}
