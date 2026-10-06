"use client";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useSupabase } from "@/components/supabase-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ContentEditor, { type ContentInput, type ContentRow, type ContentSection } from "./editor";
import { projectImageBucket, skillCategories, statusLabels, type Project } from "@/lib/portfolio/types";
import { validateProjectImage } from "@/lib/portfolio/validation";

type Row = ContentRow;
const shortDate = (value: string | null) => value ? new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)) : "—";
// One description per section: its table, its words, and the second column of its list.
const sections: Record<ContentSection, { table: string; title: string; one: string; intro: string; column: string; cell: (row: Row) => React.ReactNode }> = {
  skills: { table: "skills", title: "Skills", one: "skill", intro: "Manage skill names, categories, levels, and display order.", column: "Category", cell: row => skillCategories.find(category => category.key === (row as { category: string }).category)?.title },
  projects: { table: "projects", title: "Projects", one: "project", intro: "Manage project content, links, images, visibility, and display order.", column: "Status", cell: row => <span className="admin-status">{statusLabels[(row as Project).status]}</span> },
  certifications: { table: "certifications", title: "Certifications", one: "certification", intro: "Manage courses, issuers, scores, badges, and certificate links.", column: "Issuer", cell: row => (row as { issuer: string | null }).issuer || "—" },
  experience: { table: "experiences", title: "Experience", one: "experience", intro: "Manage internships and roles, what you did, and when.", column: "Dates", cell: row => { const r = row as { started_on: string | null; ended_on: string | null }; return r.started_on ? `${shortDate(r.started_on)} – ${r.ended_on ? shortDate(r.ended_on) : "present"}` : "—"; } },
  achievements: { table: "achievements", title: "Achievements", one: "achievement", intro: "Manage milestones, awards, and links to the details.", column: "Highlight", cell: row => (row as { recognition: string | null }).recognition || "—" },
};
export default function ContentManager({ section }: { section: ContentSection }) {
  const config = sections[section]; const table = config.table;
  const supabase = useSupabase(); const [rows, setRows] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [editing, setEditing] = useState<{ item: Row | null } | null>(null); const [deleting, setDeleting] = useState<Row | null>(null); const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    if (!supabase) return;
    return supabase.from(table).select("*").order("display_order").order("created_at").order("id").then(({ data, error }) => {
      if (error) setError("Content could not be loaded. Check the Supabase connection, tables, and admin access.");
      else { setRows((data || []) as Row[]); setError(""); }
      setLoading(false);
    }, () => { setError("Content could not be loaded. Check the Supabase connection, tables, and admin access."); setLoading(false); });
  }, [supabase, table]);
  useEffect(() => { void load(); }, [load]);
  async function requireCurrentAdmin() {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { data: { user }, error } = await supabase.auth.getUser(); const membership = user && !error ? await supabase.rpc("is_portfolio_admin") : null;
    if (!user || error || membership?.error || membership?.data !== true) { window.location.replace("/admin/"); throw new Error("Your admin session has ended. Sign in again."); }
  }
  async function removeUnreferencedImage(path: string) {
    if (!supabase) return;
    try {
    const references = await supabase.from("projects").select("id").eq("image_path", path).limit(1);
    if (references.error) {
      toast.warning("The image was kept because its saved references could not be checked. Review the project and Storage before removing it.");
      return;
    }
    if (references.data?.length) return;
    const cleanup = await supabase.storage.from(projectImageBucket).remove([path]);
    if (cleanup.error) toast.warning("An unused image remains in Storage. Review it there before removing it.");
    } catch {
      toast.warning("The image was kept because cleanup could not be verified. Review the saved project and Storage.");
    }
  }
  async function save(values: ContentInput, file: File | null) {
    if (!supabase || busy) return; setBusy(true); let uploadedPath: string | null = null;
    try {
      await requireCurrentAdmin(); let payload = values;
      if (section === "projects" && file) {
        const extension = validateProjectImage(file); uploadedPath = `projects/${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage.from(projectImageBucket).upload(uploadedPath, file, { upsert: false, contentType: file.type, cacheControl: "3600" });
        if (error) throw new Error("Image upload failed. Check that the project-images bucket exists, its file limits, and admin Storage policies.");
        payload = { ...values, image_path: uploadedPath } as ContentInput;
      }
      const id = editing?.item?.id;
      const databasePayload: Record<string, unknown> = { ...payload };
      const mutation = id ? supabase.from(table).update(databasePayload).eq("id", id).eq("updated_at", editing!.item!.updated_at) : supabase.from(table).insert(databasePayload);
      const { data, error } = await mutation.select("id").maybeSingle();
      if (error) throw new Error("Save could not be confirmed. Your edits are still here; check the saved list before trying again.");
      if (!data) {
        await load();
        throw new Error("This record changed elsewhere or your access changed. Your edits are kept; cancel and reopen the latest record before saving.");
      }
      const oldPath = editing?.item && "image_path" in editing.item ? editing.item.image_path : null;
      if (oldPath && uploadedPath && oldPath !== uploadedPath) await removeUnreferencedImage(oldPath);
      uploadedPath = null; setEditing(null); toast.success(id ? "Changes saved." : `${config.one[0].toUpperCase()}${config.one.slice(1)} added.`); await load();
    } catch (error) {
      if (uploadedPath) await removeUnreferencedImage(uploadedPath);
      toast.error(error instanceof Error ? error.message : "Save failed. Your edits have been kept.");
    } finally { setBusy(false); }
  }
  async function remove() {
    if (!supabase || !deleting || busy) return; setBusy(true);
    try {
      await requireCurrentAdmin(); const { data, error } = await supabase.from(table).delete().eq("id", deleting.id).eq("updated_at", deleting.updated_at).select("id");
      if (error) throw new Error("Deletion could not be confirmed. Refresh the list before trying again.");
      if (data?.length !== 1) { setDeleting(null); await load(); throw new Error("This record changed elsewhere or your access changed. Review the refreshed list before deleting."); }
      if ("image_path" in deleting && deleting.image_path) await removeUnreferencedImage(deleting.image_path);
      setDeleting(null); toast.success(`${config.one[0].toUpperCase()}${config.one.slice(1)} deleted.`); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Delete failed."); } finally { setBusy(false); }
  }
  const itemName = (item: Row) => "name" in item ? item.name : item.title;
  const hasLevel = section === "skills"; const columns = hasLevel ? 5 : 4;
  return <><div className="admin-page-heading"><div><h1>{config.title}</h1><p>{config.intro}</p></div><Button onClick={() => setEditing({ item: null })}><Plus />Add {config.one}</Button></div>
    {error && <div className="admin-error" role="alert">{error}<Button variant="link" onClick={() => void load()}>Retry</Button></div>}
    <div className="admin-table-wrap"><Table><TableHeader><TableRow><TableHead>{section === "skills" ? "Skill" : "Title"}</TableHead><TableHead>{config.column}</TableHead>{hasLevel && <TableHead>Level</TableHead>}<TableHead>Order</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>{rows.map(row => <TableRow key={row.id}><TableCell className="font-medium">{itemName(row)}</TableCell><TableCell>{config.cell(row)}</TableCell>{hasLevel && <TableCell>{(row as { level: string | null }).level || "—"}</TableCell>}<TableCell>{row.display_order}</TableCell><TableCell><div className="admin-row-actions"><Button variant="outline" size="sm" onClick={() => setEditing({ item: row })} aria-label={`Edit ${itemName(row)}`}><Pencil />Edit</Button><Button variant="outline" size="sm" onClick={() => setDeleting(row)} aria-label={`Delete ${itemName(row)}`}><Trash2 />Delete</Button></div></TableCell></TableRow>)}{rows.length === 0 && <TableRow><TableCell colSpan={columns}>{loading ? "Loading content…" : `No ${config.title.toLowerCase()} yet. Add your first ${config.one}.`}</TableCell></TableRow>}</TableBody></Table></div>
    <Dialog open={editing !== null} onOpenChange={open => { if (!open && !busy) setEditing(null); }}><DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" showCloseButton={!busy}><DialogHeader><DialogTitle>{editing?.item ? "Edit" : "Add"} {config.one}</DialogTitle><DialogDescription>Save to update your portfolio content. Cancel leaves saved content unchanged.</DialogDescription></DialogHeader>{editing && <ContentEditor key={editing.item?.id || `new-${section}`} section={section} item={editing.item} busy={busy} onSave={save} onCancel={() => setEditing(null)} />}</DialogContent></Dialog>
    <AlertDialog open={deleting !== null} onOpenChange={open => { if (!open && !busy) setDeleting(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {deleting ? itemName(deleting) : "this item"}?</AlertDialogTitle><AlertDialogDescription>This removes the {config.one} from your saved portfolio content.{deleting && "image_path" in deleting && deleting.image_path ? " Its uploaded image will also be deleted." : ""} This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" disabled={busy} onClick={event => { event.preventDefault(); void remove(); }}>{busy && <Loader2 className="animate-spin" />}Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}
