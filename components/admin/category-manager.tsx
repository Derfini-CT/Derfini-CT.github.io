"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useSupabase } from "@/components/supabase-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { categoryKeyFromTitle, skillCategoryInputSchema, type SkillCategoryInput } from "@/lib/portfolio/validation";
import type { SkillCategoryRecord } from "@/lib/portfolio/types";

function CategoryEditor({ item, busy, onSave, onCancel }: { item: SkillCategoryRecord | null; busy: boolean; onSave: (input: SkillCategoryInput) => Promise<void>; onCancel: () => void }) {
  const [title, setTitle] = useState(item?.title || ""); const [description, setDescription] = useState(item?.description || ""); const [order, setOrder] = useState(String(item?.display_order ?? 0)); const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const parsed = skillCategoryInputSchema.safeParse({ key: item?.key || categoryKeyFromTitle(title), title, description, display_order: Number(order) });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || "Check the category details."); return; }
    setError(""); await onSave(parsed.data);
  }
  return <form onSubmit={submit} className="admin-editor-form admin-modal-form"><div><label htmlFor="category-title">Category name</label><Input id="category-title" value={title} onChange={event => setTitle(event.target.value)} required maxLength={100} disabled={busy} placeholder="For example, VLSI design" /></div><div><label htmlFor="category-description">Description (optional)</label><Textarea id="category-description" value={description} onChange={event => setDescription(event.target.value)} maxLength={400} disabled={busy} rows={3} /></div><div><label htmlFor="category-order">Display order</label><Input id="category-order" value={order} onChange={event => setOrder(event.target.value)} required type="number" min={0} step={1} disabled={busy} /><p className="admin-editor-help">Lower numbers appear first on the portfolio and in the skill selector.</p></div>{item && <p className="admin-editor-help">Category key: {item.key}. Renaming its heading keeps all assigned skills.</p>}{error && <p className="admin-error" role="alert">{error}</p>}<DialogFooter><Button type="button" variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button><Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />}Save</Button></DialogFooter></form>;
}

export default function CategoryManager() {
  const supabase = useSupabase(); const [rows, setRows] = useState<SkillCategoryRecord[]>([]); const [counts, setCounts] = useState<Record<string, number>>({}); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [editing, setEditing] = useState<{ item: SkillCategoryRecord | null } | null>(null); const [deleting, setDeleting] = useState<SkillCategoryRecord | null>(null);
  const load = useCallback(async () => {
    if (!supabase) return;
    try {
      const [categories, skills] = await Promise.all([supabase.from("skill_categories").select("*").order("display_order").order("created_at").order("id"), supabase.from("skills").select("category")]);
      if (categories.error || skills.error) throw new Error("Skill categories could not be loaded. Check your connection and admin access. For first-time setup, apply supabase/portfolio-management.sql.");
      setRows((categories.data || []) as SkillCategoryRecord[]); const nextCounts: Record<string, number> = {};
      for (const skill of skills.data || []) nextCounts[skill.category] = (nextCounts[skill.category] || 0) + 1;
      setCounts(nextCounts); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Categories could not be loaded."); }
    finally { setLoading(false); }
  }, [supabase]);
  useEffect(() => { let active = true; void Promise.resolve().then(() => { if (active) void load(); }); return () => { active = false; }; }, [load]);
  async function requireAdmin() {
    if (!supabase) throw new Error("Supabase is not configured.");
    const user = await supabase.auth.getUser(); const membership = user.data.user && !user.error ? await supabase.rpc("is_portfolio_admin") : null;
    if (!user.data.user || user.error || membership?.error || membership?.data !== true) { window.location.replace("/admin/"); throw new Error("Your admin session has ended. Sign in again."); }
  }
  async function save(input: SkillCategoryInput) {
    if (!supabase || busy) return; setBusy(true);
    try {
      await requireAdmin(); const parsed = skillCategoryInputSchema.parse(input); const existing = editing?.item;
      const mutation = existing ? supabase.from("skill_categories").update(parsed).eq("id", existing.id).eq("updated_at", existing.updated_at) : supabase.from("skill_categories").insert(parsed);
      const { data, error } = await mutation.select("id").maybeSingle();
      if (error) throw new Error(error.code === "23505" ? "A category with that name already exists. Use a different name." : "Save could not be confirmed. Your edits are kept; refresh the category list before trying again.");
      if (!data) { await load(); throw new Error("This category changed elsewhere or your access changed. Cancel and reopen the latest category before saving."); }
      setEditing(null); toast.success(existing ? "Category updated." : "Category added."); await load();
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Category could not be saved."); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!supabase || !deleting || busy) return; setBusy(true);
    try {
      await requireAdmin();
      const used = await supabase.from("skills").select("id", { count: "exact", head: true }).eq("category", deleting.key);
      if (used.error) throw new Error("Assigned skills could not be checked. The category has been kept.");
      if (used.count) throw new Error(`This category contains ${used.count} skill${used.count === 1 ? "" : "s"}. Move or delete those skills before deleting the category.`);
      const result = await supabase.from("skill_categories").delete().eq("id", deleting.id).eq("updated_at", deleting.updated_at).select("id");
      if (result.error) throw new Error(["23503", "23001"].includes(result.error.code) ? "This category is used by a skill. Move its skills to another category first." : "Deletion could not be confirmed. Refresh the list before trying again.");
      if (result.data?.length !== 1) { setDeleting(null); await load(); throw new Error("This category changed elsewhere or your access changed. Review the refreshed list before deleting."); }
      setDeleting(null); toast.success("Category deleted."); await load();
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Category could not be deleted."); }
    finally { setBusy(false); }
  }
  return <><div className="admin-page-heading"><div><h1>Skill categories</h1><p>Add groups and edit their headings, descriptions, and display order.</p></div><Button onClick={() => setEditing({ item: null })} disabled={loading || Boolean(error)}><Plus />Add category</Button></div><p className="admin-editor-help">Each skill belongs to one category. A category with assigned skills cannot be deleted. <Link href="/admin/dashboard/skills/">Manage skills</Link>.</p>{error && <div className="admin-error" role="alert">{error}<Button variant="link" onClick={() => void load()}>Retry</Button></div>}<div className="admin-table-wrap"><Table><TableHeader><TableRow><TableHead>Category</TableHead><TableHead>Description</TableHead><TableHead>Skills</TableHead><TableHead>Order</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>{rows.map(category => <TableRow key={category.id}><TableCell className="font-medium">{category.title}</TableCell><TableCell>{category.description || "—"}</TableCell><TableCell>{counts[category.key] || 0}</TableCell><TableCell>{category.display_order}</TableCell><TableCell><div className="admin-row-actions"><Button variant="outline" size="sm" onClick={() => setEditing({ item: category })} aria-label={`Edit ${category.title}`}><Pencil />Edit</Button><Button variant="outline" size="sm" onClick={() => setDeleting(category)} aria-label={`Delete ${category.title}`}><Trash2 />Delete</Button></div></TableCell></TableRow>)}{rows.length === 0 && <TableRow><TableCell colSpan={5}>{loading ? "Loading categories…" : "No categories yet. Add one before adding a skill."}</TableCell></TableRow>}</TableBody></Table></div><Dialog open={editing !== null} onOpenChange={open => { if (!open && !busy) setEditing(null); }}><DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto" showCloseButton={!busy}><DialogHeader><DialogTitle>{editing?.item ? "Edit" : "Add"} category</DialogTitle><DialogDescription>Changes apply to the skill groups on your public portfolio.</DialogDescription></DialogHeader>{editing && <CategoryEditor key={editing.item?.id || "new-category"} item={editing.item} busy={busy} onSave={save} onCancel={() => setEditing(null)} />}</DialogContent></Dialog><AlertDialog open={deleting !== null} onOpenChange={open => { if (!open && !busy) setDeleting(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {deleting?.title || "this category"}?</AlertDialogTitle><AlertDialogDescription>{deleting && counts[deleting.key] ? `This category has ${counts[deleting.key]} assigned skills. Move or delete those skills first. The category will be kept.` : "This removes an empty category from your portfolio. This action cannot be undone."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><AlertDialogAction disabled={busy || Boolean(deleting && counts[deleting.key])} onClick={event => { event.preventDefault(); void remove(); }}>{busy && <Loader2 className="animate-spin" />}Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>;
}
