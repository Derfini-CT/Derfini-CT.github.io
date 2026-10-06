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
import { skillCategories } from "@/lib/portfolio/types";
import { defaultSiteContent, resolveSiteContent, siteContentSchema, type SiteContent } from "@/lib/portfolio/site";

type Load = { state: "loading" } | { state: "missing" } | { state: "error" } | { state: "ready"; updatedAt: string | null };
const sectionNames: Record<keyof SiteContent["sections"], string> = { about: "About", education: "Education", skills: "Skills", projects: "Projects", experience: "Experience", certifications: "Certifications", achievements: "Achievements", contact: "Contact" };
const blankHighlight = { value: "", unit: "", label: "" };
const blankEducation = { year: "", level: "", school: "", detail: "", score: "", unit: "", note: "" };

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
  const loaded = useRef(false);

  async function fetchSite() {
    if (!supabase) return;
    setLoad({ state: "loading" });
    const { data, error } = await supabase.from("site_content").select("data,updated_at").eq("id", 1).maybeSingle();
    // PGRST205 / 42P01: the table has not been created yet (supabase/site-content.sql).
    if (error) { setLoad({ state: error.code === "PGRST205" || error.code === "42P01" ? "missing" : "error" }); return; }
    setSite(resolveSiteContent(data?.data)); setDirty(false); setError("");
    setLoad({ state: "ready", updatedAt: data?.updated_at ?? null });
  }
  useEffect(() => { if (!loaded.current) { loaded.current = true; void fetchSite(); } });
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function change(next: (current: SiteContent) => SiteContent) { setSite(current => next(current)); setDirty(true); setError(""); }
  const set = <K extends keyof SiteContent>(key: K) => <F extends keyof SiteContent[K]>(field: F) => (value: SiteContent[K][F]) => change(current => ({ ...current, [key]: { ...current[key], [field]: value } }));
  const profile = set("profile"), hero = set("hero"), about = set("about"), softSkills = set("softSkills"), nextChapter = set("nextChapter"), contact = set("contact"), footer = set("footer");
  const heading = (key: keyof SiteContent["sections"], field: "title" | "intro") => (value: string) => change(current => ({ ...current, sections: { ...current.sections, [key]: { ...current.sections[key], [field]: value } } }));
  const group = (key: keyof SiteContent["skillGroups"], field: "title" | "description") => (value: string) => change(current => ({ ...current, skillGroups: { ...current.skillGroups, [key]: { ...current.skillGroups[key], [field]: value } } }));
  const listItem = <L extends "highlights" | "interests" | "education">(list: L, index: number, field: keyof SiteContent[L][number]) => (value: string) => change(current => ({ ...current, [list]: (current[list] as SiteContent[L][number][]).map((item, i) => i === index ? { ...item, [field]: value } : item) }));

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || busy || load.state !== "ready") return;
    const parsed = siteContentSchema.safeParse(site);
    if (!parsed.success) { const issue = parsed.error.issues[0]; const where = issue?.path.map(part => typeof part === "number" ? `item ${part + 1}` : part).join(" › "); setError(issue ? `${issue.message}${where ? ` (${where})` : ""}` : "Check the fields and try again."); return; }
    setBusy(true);
    try {
      // Saving only if nobody else saved since this page loaded keeps two tabs from overwriting each other.
      const result = load.updatedAt
        ? await supabase.from("site_content").update({ data: parsed.data }).eq("id", 1).eq("updated_at", load.updatedAt).select("updated_at").maybeSingle()
        : await supabase.from("site_content").insert({ id: 1, data: parsed.data }).select("updated_at").maybeSingle();
      if (result.error) throw new Error("Save could not be confirmed. Your edits are still here; check your admin access and try again.");
      if (!result.data) throw new Error("This text was saved from another tab or device since you opened it. Copy anything you need, then reload the page to see the latest version.");
      setLoad({ state: "ready", updatedAt: result.data.updated_at }); setDirty(false);
      toast.success("Site content saved. Reload the portfolio to see it.");
    } catch (error) { setError(error instanceof Error ? error.message : "Save failed. Your edits have been kept."); }
    finally { setBusy(false); }
  }

  if (load.state === "loading") return <div className="admin-loading" role="status"><Loader2 className="animate-spin" />Loading site content…</div>;
  if (load.state === "missing") return <><div className="admin-page-heading"><div><h1>Site content</h1><p>Your name, links, hero, about, education, headings and footer.</p></div></div>
    <div className="admin-notice" role="status"><strong>One setup step is needed first</strong><p>The database doesn’t have a place for this text yet. In Supabase, open SQL Editor, paste the contents of <code>supabase/site-content.sql</code> from the repository, and run it once. Then reload this page. Until then the portfolio keeps showing its built-in text.</p></div></>;
  if (load.state === "error") return <><div className="admin-page-heading"><div><h1>Site content</h1></div></div><div className="admin-error" role="alert">Site content could not be loaded. Check the connection and your admin access.<Button variant="link" onClick={() => void fetchSite()}>Retry</Button></div></>;

  const disabled = busy;
  return <form onSubmit={save} className="admin-site-form">
    <div className="admin-page-heading"><div><h1>Site content</h1><p>Every piece of text on the portfolio that isn’t a skill, project, certification, experience or achievement.</p></div></div>
    <nav className="admin-site-jump" aria-label="Jump to a group">{[["profile", "Profile"], ["hero", "Hero"], ["highlights", "Highlights"], ["focus", "Focus areas"], ["about", "About"], ["education", "Education"], ["skills", "Skill groups"], ["headings", "Headings"], ["closing", "Contact & footer"]].map(([id, label]) => <a key={id} href={`#${id}-title`}>{label}</a>)}</nav>

    <Group id="profile" title="Profile" hint="Your name is split in two because the hero sets the second part on its own line.">
      <Field id="first-name" label="First name" value={site.profile.firstName} onChange={profile("firstName")} maxLength={40} disabled={disabled} />
      <Field id="last-name" label="Rest of the name" value={site.profile.lastName} onChange={profile("lastName")} maxLength={40} disabled={disabled} />
      <Field id="email" label="Email" value={site.profile.email} onChange={profile("email")} maxLength={254} help="Used by the contact form and the copy button." disabled={disabled} />
      <Field id="resume" label="Resume link" value={site.profile.resumeUrl} onChange={profile("resumeUrl")} maxLength={2048} help="A file on this site like /Derfini_Resume.pdf, or a full link such as a Google Drive share. Empty hides the resume buttons." disabled={disabled} />
      <Field id="linkedin" label="LinkedIn link" value={site.profile.linkedin} onChange={profile("linkedin")} maxLength={2048} help="Empty hides the LinkedIn buttons." disabled={disabled} />
      <Field id="github" label="GitHub link" value={site.profile.github} onChange={profile("github")} maxLength={2048} help="Empty hides the GitHub buttons." disabled={disabled} />
      <Field id="location" label="Location" value={site.profile.location} onChange={profile("location")} maxLength={80} disabled={disabled} />
      <Field id="study" label="Study line" value={site.profile.studyLine} onChange={profile("studyLine")} maxLength={80} placeholder="B.E. ECE, 3rd year" disabled={disabled} />
    </Group>

    <Group id="hero" title="Hero" hint="The first screen of the portfolio.">
      <Field id="hero-kicker" label="Small line above your name" value={site.hero.kicker} onChange={hero("kicker")} maxLength={80} disabled={disabled} />
      <Field id="hero-title" label="Headline under your name" value={site.hero.title} onChange={hero("title")} maxLength={160} disabled={disabled} />
      <Field id="hero-intro" label="Introduction" value={site.hero.intro} onChange={hero("intro")} maxLength={600} multiline disabled={disabled} />
      <Field id="scope-left" label="Oscilloscope caption, left" value={site.hero.scopeLeft} onChange={hero("scopeLeft")} maxLength={80} disabled={disabled} />
      <Field id="scope-right" label="Oscilloscope caption, right" value={site.hero.scopeRight} onChange={hero("scopeRight")} maxLength={80} disabled={disabled} />
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

    <Group id="skills" title="Skill groups" hint="The four chip cards in the Skills section. Individual skills are managed on the Skills page.">
      {skillCategories.map(({ key }) => <div className="admin-site-pair" key={key}>
        <Field id={`grp-title-${key}`} label="Group title" value={site.skillGroups[key].title} onChange={group(key, "title")} maxLength={60} disabled={disabled} />
        <Field id={`grp-desc-${key}`} label="Description" value={site.skillGroups[key].description} onChange={group(key, "description")} maxLength={200} disabled={disabled} />
      </div>)}
      <Field id="soft-title" label="Soft skills title" value={site.softSkills.title} onChange={softSkills("title")} maxLength={80} disabled={disabled} />
      <Field id="soft-note" label="Soft skills side note" value={site.softSkills.note} onChange={softSkills("note")} maxLength={300} disabled={disabled} />
      <Field id="soft-text" label="Soft skills text" value={site.softSkills.text} onChange={softSkills("text")} maxLength={600} multiline rows={2} help="Empty title and text hide the soft skills strip." disabled={disabled} />
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
  </form>;
}

function RowTools({ index, count, name, disabled, onMove, onRemove }: { index: number; count: number; name: string; disabled: boolean; onMove: (to: number) => void; onRemove: () => void }) {
  return <div className="admin-site-tools">
    <Button type="button" variant="outline" size="icon" disabled={disabled || index === 0} onClick={() => onMove(index - 1)} aria-label={`Move ${name} up`}><ArrowUp /></Button>
    <Button type="button" variant="outline" size="icon" disabled={disabled || index === count - 1} onClick={() => onMove(index + 1)} aria-label={`Move ${name} down`}><ArrowDown /></Button>
    <Button type="button" variant="outline" size="icon" disabled={disabled} onClick={onRemove} aria-label={`Remove ${name}`}><Trash2 /></Button>
  </div>;
}
