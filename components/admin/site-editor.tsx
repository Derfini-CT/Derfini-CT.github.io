"use client";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useSupabase } from "@/components/supabase-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { projectImageBucket } from "@/lib/portfolio/types";
import { validateProjectImage } from "@/lib/portfolio/validation";
import { defaultSiteContent, resolveSiteContent, siteContentSchema, type SiteContent } from "@/lib/portfolio/site";

type Load = { state: "loading" } | { state: "missing" } | { state: "error" } | { state: "ready"; updatedAt: string | null };
const sectionNames: Record<keyof SiteContent["sections"], string> = { about: "About", education: "Education", skills: "Skills", projects: "Projects", experience: "Experience", certifications: "Certifications", achievements: "Achievements", contact: "Contact" };
const blankHighlight = { value: "", unit: "", label: "" };
const blankEducation = { year: "", level: "", school: "", detail: "", score: "", unit: "", note: "" };
const labelNames: Record<string, string> = {
  about: "About", education: "Education", skills: "Skills", projects: "Projects", experience: "Experience", certifications: "Certifications", achievements: "Achievements", contact: "Contact",
  resume: "Navigation resume button", viewResume: "View resume button", linkedin: "LinkedIn button", github: "GitHub button", contactMe: "Contact button", repository: "Repository button", liveDemo: "Live demo button", keyFeatures: "Project features heading", certificate: "Certificate button", viewDetails: "Achievement details link",
  nameLabel: "Name field label", namePlaceholder: "Name placeholder", emailLabel: "Email field label", emailPlaceholder: "Email placeholder", subjectLabel: "Subject field label", subjectPlaceholder: "Subject placeholder", messageLabel: "Message field label", messagePlaceholder: "Message placeholder", submit: "Prepare email button", help: "Email form explanation", draftReady: "Draft ready message", openDraft: "Reopen email draft link", copyEmail: "Copy email button", emailCopied: "Email copied message", defaultSubject: "Default email subject", greeting: "Email greeting", from: "Email sender label", replyTo: "Email reply address label",
  project: "Project visual label", projectDetails: "Missing project features", organization: "Missing organization", experienceDates: "Missing internship dates", present: "Ongoing experience end date", experienceCategory: "Other experience category", embeddedCategory: "Embedded experience category", analyticsCategory: "Analytics experience category", issuer: "Missing certificate issuer", completionDetails: "Missing certificate completion details", completed: "Certificate completion date prefix", courseScore: "Certificate score label", achievement: "Missing achievement recognition", mobileDescription: "Mobile navigation description",
};
function labelLimit(group: keyof SiteContent["labels"], key: string) {
  if (group === "nav") return 40;
  if (group === "actions") return 80;
  if (group === "form") return key === "messagePlaceholder" ? 300 : ["help", "draftReady"].includes(key) ? 400 : key === "defaultSubject" ? 150 : key.endsWith("Placeholder") ? 160 : 80;
  return key === "projectDetails" ? 1000 : ["skills", "projects", "experience", "certifications", "completionDetails"].includes(key) ? 300 : ["organization", "experienceDates", "issuer"].includes(key) ? 160 : key === "mobileDescription" ? 200 : key === "present" ? 40 : 80;
}

function Group({ id, title, hint, children }: { id: string; title: string; hint?: string; children: ReactNode }) {
  return <section className="admin-information admin-site-group" aria-labelledby={`${id}-title`}><h2 id={`${id}-title`}>{title}</h2>{hint && <p>{hint}</p>}<div className="admin-site-fields">{children}</div></section>;
}
function Field({ id, label, value, onChange, multiline, rows = 3, help, maxLength, placeholder, disabled }: { id: string; label: string; value: string; onChange: (value: string) => void; multiline?: boolean; rows?: number; help?: string; maxLength?: number; placeholder?: string; disabled?: boolean }) {
  return <div className={multiline ? "admin-site-wide" : undefined}><label htmlFor={id}>{label}</label>{multiline
    ? <Textarea id={id} value={value} onChange={event => onChange(event.target.value)} rows={rows} maxLength={maxLength} placeholder={placeholder} disabled={disabled} />
    : <Input id={id} value={value} onChange={event => onChange(event.target.value)} maxLength={maxLength} placeholder={placeholder} disabled={disabled} />}{help && <p className="admin-editor-help">{help}</p>}</div>;
}
function move<T>(items: T[], from: number, to: number) { const next = items.slice(); const [item] = next.splice(from, 1); next.splice(to, 0, item); return next; }

export default function SiteEditor() {
  const supabase = useSupabase();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [site, setSite] = useState<SiteContent>(defaultSiteContent);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoRemovalOpen, setPhotoRemovalOpen] = useState(false);
  const loaded = useRef(false);

  async function fetchSite() {
    if (!supabase) return;
    setLoad({ state: "loading" });
    try {
      const { data, error } = await supabase.from("site_content").select("data,updated_at").eq("id", 1).maybeSingle();
      // PGRST205 / 42P01: the table has not been created yet (supabase/site-content.sql).
      if (error) { setLoad({ state: error.code === "PGRST205" || error.code === "42P01" ? "missing" : "error" }); return; }
      setSite(resolveSiteContent(data?.data)); setDirty(false); setError(""); setPhotoFile(null); setPhotoPreview("");
      setLoad({ state: "ready", updatedAt: data?.updated_at ?? null });
    } catch { setLoad({ state: "error" }); }
  }
  useEffect(() => { if (!loaded.current) { loaded.current = true; void fetchSite(); } });
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview); }, [photoPreview]);

  function change(next: (current: SiteContent) => SiteContent) { setSite(current => next(current)); setDirty(true); setError(""); }
  const set = <K extends keyof SiteContent>(key: K) => <F extends keyof SiteContent[K]>(field: F) => (value: SiteContent[K][F]) => change(current => ({ ...current, [key]: { ...current[key], [field]: value } }));
  const profile = set("profile"), hero = set("hero"), about = set("about"), softSkills = set("softSkills"), nextChapter = set("nextChapter"), contact = set("contact"), footer = set("footer");
  const heading = (key: keyof SiteContent["sections"], field: "title" | "intro") => (value: string) => change(current => ({ ...current, sections: { ...current.sections, [key]: { ...current.sections[key], [field]: value } } }));
  const label = <G extends keyof SiteContent["labels"]>(group: G, key: keyof SiteContent["labels"][G]) => (value: string) => change(current => ({ ...current, labels: { ...current.labels, [group]: { ...current.labels[group], [key]: value } } }));
  const listItem = <L extends "highlights" | "interests" | "education">(list: L, index: number, field: keyof SiteContent[L][number]) => (value: string) => change(current => ({ ...current, [list]: (current[list] as SiteContent[L][number][]).map((item, i) => i === index ? { ...item, [field]: value } : item) }));

  function choosePhoto(file: File | null) {
    if (!file) return;
    try {
      validateProjectImage(file); setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file));
      change(current => ({ ...current, profile: { ...current.profile, showPhoto: true } }));
    } catch (error) { setError(error instanceof Error ? error.message : "Choose a valid profile image."); }
  }
  async function requireCurrentAdmin() {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { data: { user }, error } = await supabase.auth.getUser();
    const membership = user && !error ? await supabase.rpc("is_portfolio_admin") : null;
    if (!user || error || membership?.error || membership?.data !== true) {
      window.location.replace("/admin/"); throw new Error("Your admin session has ended. Sign in again.");
    }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || busy || load.state !== "ready") return;
    const parsed = siteContentSchema.safeParse(site);
    if (!parsed.success) { const issue = parsed.error.issues[0]; const where = issue?.path.map(part => typeof part === "number" ? `item ${part + 1}` : part).join(" › "); setError(issue ? `${issue.message}${where ? ` (${where})` : ""}` : "Check the fields and try again."); return; }
    if (parsed.data.profile.showPhoto && !parsed.data.profile.photoPath && !photoFile) { setError("Choose a profile image first, or turn off Show profile photo."); return; }
    setBusy(true);
    let photoUploaded = false;
    try {
      await requireCurrentAdmin();
      const savedSite = parsed.data;
      if (photoFile) {
        const extension = validateProjectImage(photoFile);
        const uploadedPath = `profile/${crypto.randomUUID()}.${extension}`;
        const upload = await supabase.storage.from(projectImageBucket).upload(uploadedPath, photoFile, { upsert: false, contentType: photoFile.type, cacheControl: "3600" });
        if (upload.error) throw new Error("Photo upload failed. Check the image limits and the profile image Storage policies.");
        photoUploaded = true;
        savedSite.profile = { ...savedSite.profile, photoPath: uploadedPath };
      }
      // Saving only if nobody else saved since this page loaded keeps two tabs from overwriting each other.
      const result = load.updatedAt
        ? await supabase.from("site_content").update({ data: savedSite }).eq("id", 1).eq("updated_at", load.updatedAt).select("updated_at").maybeSingle()
        : await supabase.from("site_content").insert({ id: 1, data: savedSite }).select("updated_at").maybeSingle();
      if (result.error) throw new Error("Save could not be confirmed. Your edits are still here; check your admin access and try again.");
      if (!result.data) throw new Error("This text was saved from another tab or device since you opened it. Copy anything you need, then reload the page to see the latest version.");
      setSite(savedSite); setPhotoFile(null); setPhotoPreview("");
      setLoad({ state: "ready", updatedAt: result.data.updated_at }); setDirty(false);
      toast.success("Site content saved. Reload the portfolio to see it.");
    } catch (error) {
      // A timed-out save can still commit after the client stops waiting. Keep
      // the upload rather than risk deleting a photo that was just referenced.
      if (photoUploaded) toast.warning("The uploaded photo was kept in Storage because the save could not be confirmed. Your edits remain available to retry.");
      setError(error instanceof Error ? error.message : "Save failed. Your edits have been kept.");
    }
    finally { setBusy(false); }
  }

  if (load.state === "loading") return <div className="admin-loading" role="status"><Loader2 className="animate-spin" />Loading site content…</div>;
  if (load.state === "missing") return <><div className="admin-page-heading"><div><h1>Site content</h1><p>Your name, links, hero, about, education, headings and footer.</p></div></div>
    <div className="admin-notice" role="status"><strong>One setup step is needed first</strong><p>The database doesn’t have a place for this text yet. In Supabase, open SQL Editor, paste the contents of <code>supabase/site-content.sql</code> from the repository, and run it once. Then reload this page. Until then the portfolio keeps showing its built-in text.</p></div></>;
  if (load.state === "error") return <><div className="admin-page-heading"><div><h1>Site content</h1></div></div><div className="admin-error" role="alert">Site content could not be loaded. Check the connection and your admin access.<Button variant="link" onClick={() => void fetchSite()}>Retry</Button></div></>;

  const disabled = busy;
  const currentPhotoUrl = photoPreview || (site.profile.photoPath ? supabase?.storage.from(projectImageBucket).getPublicUrl(site.profile.photoPath).data.publicUrl : "");
  return <><form onSubmit={save} className="admin-site-form">
    <div className="admin-page-heading"><div><h1>Site content</h1><p>Every piece of text on the portfolio that isn’t a skill, project, certification, experience or achievement.</p></div></div>
    <nav className="admin-site-jump" aria-label="Jump to a group">{[["profile", "Profile & photo"], ["hero", "Hero"], ["highlights", "Highlights"], ["focus", "Focus areas"], ["about", "About"], ["education", "Education"], ["skills", "Skill groups"], ["headings", "Headings"], ["closing", "Contact & footer"], ["labels", "Buttons & labels"]].map(([id, label]) => <a key={id} href={`#${id}-title`}>{label}</a>)}</nav>

    <Group id="profile" title="Profile" hint="Your name is split in two because the hero sets the second part on its own line.">
      <Field id="first-name" label="First name" value={site.profile.firstName} onChange={profile("firstName")} maxLength={40} disabled={disabled} />
      <Field id="last-name" label="Rest of the name" value={site.profile.lastName} onChange={profile("lastName")} maxLength={40} disabled={disabled} />
      <Field id="email" label="Email" value={site.profile.email} onChange={profile("email")} maxLength={254} help="Used by the contact form and the copy button." disabled={disabled} />
      <Field id="resume" label="Resume link" value={site.profile.resumeUrl} onChange={profile("resumeUrl")} maxLength={2048} help="A file on this site like /Derfini_Resume.pdf, or a full link such as a Google Drive share. Empty hides the resume buttons." disabled={disabled} />
      <Field id="linkedin" label="LinkedIn link" value={site.profile.linkedin} onChange={profile("linkedin")} maxLength={2048} help="Empty hides the LinkedIn buttons." disabled={disabled} />
      <Field id="github" label="GitHub link" value={site.profile.github} onChange={profile("github")} maxLength={2048} help="Empty hides the GitHub buttons." disabled={disabled} />
      <Field id="location" label="Location" value={site.profile.location} onChange={profile("location")} maxLength={80} disabled={disabled} />
      <Field id="study" label="Study line" value={site.profile.studyLine} onChange={profile("studyLine")} maxLength={80} placeholder="B.E. ECE, 3rd year" disabled={disabled} />
      <div className="admin-site-wide"><label htmlFor="profile-photo">Profile photo (optional)</label><Input id="profile-photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={event => choosePhoto(event.target.files?.[0] || null)} /><p className="admin-editor-help">Choose a clear portrait in JPEG, PNG or WebP format, up to 5 MB. It uploads when you save. Replacing or removing the displayed photo keeps previous files in Storage.</p>{currentPhotoUrl && <img src={currentPhotoUrl} className="admin-image-preview" alt={site.profile.photoAlt || "Profile photo preview"} />}{(site.profile.photoPath || photoFile) && <Button type="button" variant="outline" disabled={disabled} onClick={() => setPhotoRemovalOpen(true)}>Remove displayed photo</Button>}</div>
      <div className="admin-site-wide admin-site-switch"><Switch id="profile-photo-show" checked={site.profile.showPhoto} onCheckedChange={value => profile("showPhoto")(value)} disabled={disabled} /><label htmlFor="profile-photo-show">Show profile photo in About</label></div>
      <Field id="profile-photo-alt" label="Photo description" value={site.profile.photoAlt} onChange={profile("photoAlt")} maxLength={160} help="A short description for visitors using a screen reader. Empty uses your name." disabled={disabled} />
    </Group>

    <Group id="hero" title="Hero" hint="The first screen of the portfolio.">
      <Field id="hero-kicker" label="Small line above your name" value={site.hero.kicker} onChange={hero("kicker")} maxLength={80} disabled={disabled} />
      <Field id="hero-headline" label="Headline under your name" value={site.hero.title} onChange={hero("title")} maxLength={160} disabled={disabled} />
      <Field id="hero-intro" label="Introduction" value={site.hero.intro} onChange={hero("intro")} maxLength={600} multiline disabled={disabled} />
      <Field id="scope-left" label="Oscilloscope caption, left" value={site.hero.scopeLeft} onChange={hero("scopeLeft")} maxLength={80} disabled={disabled} />
      <Field id="scope-right" label="Oscilloscope caption, right" value={site.hero.scopeRight} onChange={hero("scopeRight")} maxLength={80} disabled={disabled} />
      <div><label htmlFor="hero-name-size">Name size</label><select id="hero-name-size" className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={site.hero.nameSize} disabled={disabled} onChange={event => hero("nameSize")(event.target.value as SiteContent["hero"]["nameSize"])}><option value="balanced">Compact & balanced</option><option value="large">Original large</option></select><p className="admin-editor-help">Compact keeps your name readable without overpowering your title. The colours and animations stay the same.</p></div>
    </Group>

    <Group id="highlights" title="Highlights" hint="The strip of big numbers under the hero. Plain numbers like 9.45 or 02 count up; anything else is shown as written. Up to six.">
      {site.highlights.map((item, i) => <div className="admin-site-row" key={i}>
        <Field id={`hl-value-${i}`} label="Value" value={item.value} onChange={listItem("highlights", i, "value")} maxLength={24} disabled={disabled} />
        <Field id={`hl-unit-${i}`} label="Unit" value={item.unit} onChange={listItem("highlights", i, "unit")} maxLength={16} placeholder="/10" disabled={disabled} />
        <Field id={`hl-label-${i}`} label="Label" value={item.label} onChange={listItem("highlights", i, "label")} maxLength={80} disabled={disabled} />
        <RowTools index={i} count={site.highlights.length} name={`highlight ${i + 1}`} disabled={disabled} onMove={to => change(c => ({ ...c, highlights: move(c.highlights, i, to) }))} onRemove={() => change(c => ({ ...c, highlights: c.highlights.filter((_, j) => j !== i) }))} />
      </div>)}
      {site.highlights.length < 6 && <Button type="button" variant="outline" className="admin-site-add" disabled={disabled} onClick={() => change(c => ({ ...c, highlights: [...c.highlights, { ...blankHighlight }] }))}><Plus />Add highlight</Button>}
    </Group>

    <Group id="focus" title="Focus areas" hint="The three oscilloscope channel buttons in the hero. There are always three, one per channel colour.">
      {site.interests.map((item, i) => <div className="admin-site-pair" key={i}>
        <Field id={`int-title-${i}`} label={`Channel ${i + 1} title`} value={item.title} onChange={listItem("interests", i, "title")} maxLength={60} disabled={disabled} />
        <Field id={`int-text-${i}`} label={`Channel ${i + 1} line`} value={item.text} onChange={listItem("interests", i, "text")} maxLength={120} disabled={disabled} />
      </div>)}
    </Group>

    <Group id="about" title="About">
      <Field id="about-lead" label="Opening paragraph" value={site.about.lead} onChange={about("lead")} maxLength={600} multiline help="Shown large; it lights up word by word as visitors scroll." disabled={disabled} />
      <Field id="about-body" label="More about you" value={site.about.body} onChange={about("body")} maxLength={3000} multiline rows={5} help="Leave a blank line between paragraphs." disabled={disabled} />
      <Field id="about-note" label="Highlighted note" value={site.about.note} onChange={about("note")} maxLength={400} multiline rows={2} help="The boxed line with the shield icon. Empty hides it." disabled={disabled} />
    </Group>

    <Group id="education" title="Education" hint="The timeline, oldest first. The last stop is drawn as the current one.">
      {site.education.map((stop, i) => <fieldset className="admin-site-card" key={i}>
        <legend>{stop.year || `Stop ${i + 1}`}</legend>
        <Field id={`ed-year-${i}`} label="Year" value={stop.year} onChange={listItem("education", i, "year")} maxLength={12} placeholder="2024 or Now" disabled={disabled} />
        <Field id={`ed-level-${i}`} label="Level" value={stop.level} onChange={listItem("education", i, "level")} maxLength={80} disabled={disabled} />
        <Field id={`ed-school-${i}`} label="School or degree" value={stop.school} onChange={listItem("education", i, "school")} maxLength={160} disabled={disabled} />
        <Field id={`ed-detail-${i}`} label="Detail" value={stop.detail} onChange={listItem("education", i, "detail")} maxLength={200} disabled={disabled} />
        <Field id={`ed-score-${i}`} label="Score" value={stop.score} onChange={listItem("education", i, "score")} maxLength={12} placeholder="88.8" help="Empty hides the score." disabled={disabled} />
        <Field id={`ed-unit-${i}`} label="Score unit" value={stop.unit} onChange={listItem("education", i, "unit")} maxLength={16} placeholder="% or /10 CGPA" disabled={disabled} />
        <Field id={`ed-note-${i}`} label="Note" value={stop.note} onChange={listItem("education", i, "note")} maxLength={200} disabled={disabled} />
        <RowTools index={i} count={site.education.length} name={`education stop ${stop.year || i + 1}`} disabled={disabled} onMove={to => change(c => ({ ...c, education: move(c.education, i, to) }))} onRemove={() => change(c => ({ ...c, education: c.education.filter((_, j) => j !== i) }))} />
      </fieldset>)}
      {site.education.length < 8 && <Button type="button" variant="outline" className="admin-site-add" disabled={disabled} onClick={() => change(c => ({ ...c, education: [...c.education, { ...blankEducation }] }))}><Plus />Add education stop</Button>}
    </Group>

    <Group id="skills" title="Skill groups & soft skills" hint="Create, rename, describe and reorder skill categories from the Categories page. Individual skills are managed on the Skills page.">
      <div className="admin-site-wide"><Button type="button" asChild variant="outline"><Link href="/admin/dashboard/categories/">Manage skill categories</Link></Button></div>
      <Field id="soft-title" label="Soft skills title" value={site.softSkills.title} onChange={softSkills("title")} maxLength={80} disabled={disabled} />
      <Field id="soft-note" label="Soft skills side note" value={site.softSkills.note} onChange={softSkills("note")} maxLength={300} disabled={disabled} />
      <Field id="soft-text" label="Soft skills text" value={site.softSkills.text} onChange={softSkills("text")} maxLength={600} multiline rows={2} help="Empty title and text hide the soft skills strip." disabled={disabled} />
    </Group>

    <Group id="labels" title="Buttons, navigation & form text" hint="These fields change the wording without changing the design. Personal details and section content are edited above.">
      {(["nav", "actions", "form", "fallback"] as const).map(group => <details key={group} className="admin-site-wide admin-site-card"><summary>{({ nav: "Navigation labels", actions: "Buttons and card labels", form: "Contact form and email draft", fallback: "Empty states and supporting labels" })[group]}</summary><div className="admin-site-fields">{(Object.keys(site.labels[group]) as (keyof SiteContent["labels"][typeof group])[]).map(key => <Field key={String(key)} id={`label-${group}-${String(key)}`} label={group === "fallback" && ["skills", "projects", "experience", "certifications"].includes(String(key)) ? `Empty ${String(key)} section` : labelNames[String(key)] || String(key)} value={site.labels[group][key]} onChange={label(group, key)} maxLength={labelLimit(group, String(key))} multiline={labelLimit(group, String(key)) >= 200} rows={2} disabled={disabled} />)}</div></details>)}
    </Group>

    <Group id="headings" title="Section headings" hint="The big heading of each section and an optional line under it.">
      {(Object.keys(sectionNames) as (keyof typeof sectionNames)[]).map(key => <div className="admin-site-pair" key={key}>
        <Field id={`sec-title-${key}`} label={`${sectionNames[key]} heading`} value={site.sections[key].title} onChange={heading(key, "title")} maxLength={160} disabled={disabled} />
        <Field id={`sec-intro-${key}`} label={`${sectionNames[key]} line under it`} value={site.sections[key].intro} onChange={heading(key, "intro")} maxLength={600} disabled={disabled} />
      </div>)}
    </Group>

    <Group id="closing" title="Achievements card, contact and footer">
      <div className="admin-site-wide admin-site-switch"><Switch id="next-show" checked={site.nextChapter.show} onCheckedChange={value => nextChapter("show")(value)} disabled={disabled} /><label htmlFor="next-show">Show the “coming next” card after your achievements</label></div>
      <Field id="next-label" label="Card label" value={site.nextChapter.label} onChange={nextChapter("label")} maxLength={40} disabled={disabled || !site.nextChapter.show} />
      <Field id="next-title" label="Card title" value={site.nextChapter.title} onChange={nextChapter("title")} maxLength={120} disabled={disabled || !site.nextChapter.show} />
      <Field id="next-text" label="Card text" value={site.nextChapter.text} onChange={nextChapter("text")} maxLength={400} multiline rows={2} disabled={disabled || !site.nextChapter.show} />
      <Field id="contact-note" label="Contact sign-off" value={site.contact.note} onChange={contact("note")} maxLength={160} disabled={disabled} />
      <Field id="footer-tagline" label="Footer tagline" value={site.footer.tagline} onChange={footer("tagline")} maxLength={120} disabled={disabled} />
    </Group>

    <div className="admin-site-savebar" role="region" aria-label="Save site content">
      {error ? <p className="admin-error" role="alert">{error}</p> : <p>{dirty ? "You have unsaved changes." : "Everything is saved."} <Link href="/" target="_blank" rel="noopener noreferrer">View portfolio</Link></p>}
      <Button type="button" variant="outline" disabled={busy || !dirty} onClick={() => void fetchSite()}>Discard changes</Button>
      <Button type="submit" disabled={busy || !dirty}>{busy && <Loader2 className="animate-spin" />}Save site content</Button>
    </div>
  </form><AlertDialog open={photoRemovalOpen} onOpenChange={setPhotoRemovalOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove the displayed profile photo?</AlertDialogTitle><AlertDialogDescription>The photo will be removed from the portfolio when you save site content. Its file stays in Storage. Cancel keeps the current selection.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { setPhotoFile(null); setPhotoPreview(""); change(current => ({ ...current, profile: { ...current.profile, photoPath: "", showPhoto: false } })); setPhotoRemovalOpen(false); }}>Remove photo</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>;
}

function RowTools({ index, count, name, disabled, onMove, onRemove }: { index: number; count: number; name: string; disabled: boolean; onMove: (to: number) => void; onRemove: () => void }) {
  return <div className="admin-site-tools">
    <Button type="button" variant="outline" size="icon" disabled={disabled || index === 0} onClick={() => onMove(index - 1)} aria-label={`Move ${name} up`}><ArrowUp /></Button>
    <Button type="button" variant="outline" size="icon" disabled={disabled || index === count - 1} onClick={() => onMove(index + 1)} aria-label={`Move ${name} down`}><ArrowDown /></Button>
    <Button type="button" variant="outline" size="icon" disabled={disabled} onClick={onRemove} aria-label={`Remove ${name}`}><Trash2 /></Button>
  </div>;
}
