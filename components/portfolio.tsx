"use client";

import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { ArrowUpRight, Award, BarChart3, BookOpen, Check, Code2, Copy, Cpu, FileText, Code2 as Github, Link2 as Linkedin, Mail, MapPin, Menu, Radio, Send, ShieldCheck } from "lucide-react";
import { skillCategories, type PortfolioContent } from "@/lib/portfolio/types";
import { safeWebUrl } from "@/lib/portfolio/validation";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import Scope from "@/components/pcb/scope";
import ProbeCursor from "@/components/pcb/probe-cursor";
import "@/components/pcb/pcb.css";

const profile = { name: "Derfini C T", email: "ctderfini@gmail.com", linkedin: "https://www.linkedin.com/in/derfini-c-t/", github: "https://github.com/Derfini-CT" };
const navigation = [{ id: "about", label: "About" }, { id: "education", label: "Education" }, { id: "skills", label: "Skills" }, { id: "projects", label: "Projects" }, { id: "experience", label: "Experience" }, { id: "certifications", label: "Certifications" }, { id: "achievements", label: "Achievements" }, { id: "contact", label: "Contact" }];
const interests = [{ icon: Cpu, title: "Embedded systems", text: "Real-time concepts & sensor data" }, { icon: Radio, title: "Electronics & communication", text: "Systems, signals & technology" }, { icon: BarChart3, title: "Data analytics", text: "From metrics to meaningful insights" }];
const education = [
  { year: "2022", level: "Secondary", school: "Christuraja Matric Hr. Sec. School", detail: "Marthandam, SSLC (10th standard)", score: "88.8", unit: "%" },
  { year: "2024", level: "Higher secondary", school: "Christuraja Matric Hr. Sec. School", detail: "Marthandam, HSC (12th standard)", score: "84.0", unit: "%" },
  { year: "Now", level: "Undergraduate, 3rd year", school: "B.E. Electronics and Communication Engineering", detail: "V.S.B. College of Engineering Technical Campus, Coimbatore", score: "9.45", unit: "/10 CGPA", note: "Expected graduation: to be added" },
];
const aboutLead = "I’m pursuing a B.E. in Electronics and Communication Engineering at V.S.B. College of Engineering Technical Campus, Coimbatore, with a CGPA of 9.45/10.";

function ExternalLink({ href, children, className = "", magnetic = false }: { href: string; children: ReactNode; className?: string; magnetic?: boolean }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className={className} data-magnetic={magnetic || undefined}>{children}<span className="sr-only"> (opens in a new tab)</span></a>;
}
function Tags({ items }: { items: string[] }) { return <ul className="tags">{items.map(item => <li key={item}>{item}</li>)}</ul>; }
function formatMonth(value: string) { return new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)); }

function Section({ id, title, intro, className = "", children }: { id: string; title: string; intro?: string; className?: string; children: ReactNode }) {
  return <section id={id} className={`sec ${className}`} data-reveal><div className="wrap">
    <header className="sec-head"><span className="sec-trace" aria-hidden="true" /><h2>{title}</h2>{intro && <p>{intro}</p>}</header>
    {children}
  </div></section>;
}

// Counts up once when scrolled into view. The final value is rendered first so the number is right without JavaScript.
function Count({ value, decimals = 0, pad = 0 }: { value: number; decimals?: number; pad?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const format = (n: number) => n.toFixed(decimals).padStart(pad, "0");
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const begin = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - begin) / 1100);
        el.textContent = format(value * (1 - (1 - p) ** 3));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.6 });
    observer.observe(el);
    return () => { observer.disconnect(); cancelAnimationFrame(raf); };
  }, [value, decimals, pad]);
  return <span ref={ref}>{value.toFixed(decimals).padStart(pad, "0")}</span>;
}

function SolarIllustration() {
  const bars = Array.from({ length: 13 }, (_, i) => Math.max(0.04, Math.sin(((i + 0.5) / 13) * Math.PI) ** 1.6));
  return <svg className="solar" viewBox="0 0 320 220" aria-hidden="true">
    <circle className="solar-sun" cx="160" cy="46" r="16" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map(a => <line key={a} className="solar-ray" x1={160 + Math.cos(a * Math.PI / 180) * 24} y1={46 + Math.sin(a * Math.PI / 180) * 24} x2={160 + Math.cos(a * Math.PI / 180) * 32} y2={46 + Math.sin(a * Math.PI / 180) * 32} />)}
    {bars.map((b, i) => <rect key={i} className="solar-bar" style={{ "--i": i } as CSSProperties} x={22 + i * 22} y={196 - b * 110} width="14" height={b * 110} rx="2" />)}
    <path className="solar-curve" d={bars.map((b, i) => `${i ? "L" : "M"}${29 + i * 22} ${190 - b * 118}`).join(" ")} />
    <line className="solar-axis" x1="14" y1="197" x2="306" y2="197" />
  </svg>;
}

export default function Portfolio({ content }: { content: PortfolioContent }) {
  const [active, setActive] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [emailDraft, setEmailDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLParagraphElement>(null);
  const solo = hovered ?? pinned;

  useEffect(() => {
    const root = rootRef.current;
    const sections = Array.from(document.querySelectorAll<HTMLElement>("main section[id]"));
    let raf = 0;
    const update = () => {
      raf = 0;
      const marker = window.scrollY + 180;
      let current = "";
      sections.forEach(section => { if (section.offsetTop <= marker) current = section.id; });
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (window.scrollY >= max - 20) current = "contact";
      setActive(current);
      setScrolled(window.scrollY > 24);
      root?.style.setProperty("--progress", String(max > 0 ? Math.min(1, window.scrollY / max) : 0));
      const about = aboutRef.current;
      if (about) {
        const rect = about.getBoundingClientRect();
        const p = (window.innerHeight * 0.85 - rect.top) / (rect.height + window.innerHeight * 0.35);
        about.style.setProperty("--lit", String(Math.min(1, Math.max(0, p))));
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add("is-in"); observer.unobserve(entry.target); } }), { threshold: 0.12 });
    document.querySelectorAll("[data-reveal]").forEach(item => observer.observe(item));
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf); observer.disconnect(); };
  }, []);

  function prepareEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const body = `Hello Derfini,\n\n${String(data.get("message")).trim()}\n\nFrom: ${String(data.get("name")).trim()}\nReply to: ${String(data.get("email")).trim()}`;
    const uri = `mailto:${profile.email}?subject=${encodeURIComponent(String(data.get("subject")).trim() || "Portfolio enquiry")}&body=${encodeURIComponent(body)}`;
    setEmailDraft(uri); setCopied(false); window.location.href = uri;
  }
  async function copyEmail(setter: (value: boolean) => void) {
    try { await navigator.clipboard.writeText(profile.email); setter(true); } catch { setter(false); }
  }

  const aboutWords = aboutLead.split(" ");
  return <div className="pcb" ref={rootRef}>
    <ProbeCursor />
    <a href="#main" className="skip-link">Skip to content</a>
    <header className={`topbar${scrolled ? " is-scrolled" : ""}`}><div className="wrap topbar-inner">
      <a className="brand" href="#home" aria-label="Derfini C T, home"><span className="brand-pad" aria-hidden="true" />Derfini C T</a>
      <nav aria-label="Main navigation" className="topnav">{navigation.map(item => <a key={item.id} href={`#${item.id}`} className={active === item.id ? "is-active" : ""} aria-current={active === item.id ? "location" : undefined}>{item.label}</a>)}</nav>
      <a className="btn btn-ghost topbar-resume" href="/Derfini_Resume.pdf" target="_blank" rel="noopener noreferrer"><FileText size={16} />Resume<span className="sr-only"> (PDF, opens in a new tab)</span></a>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetTrigger asChild><button type="button" className="menu-btn" aria-label="Open navigation"><Menu size={20} /></button></SheetTrigger>
        <SheetContent className="pcb-sheet"><SheetHeader><SheetTitle>Derfini C T</SheetTitle><SheetDescription>Explore my engineering portfolio.</SheetDescription></SheetHeader>
          <nav aria-label="Mobile navigation" className="sheet-nav">{navigation.map(item => <a key={item.id} href={`#${item.id}`} onClick={() => setMenuOpen(false)} aria-current={active === item.id ? "location" : undefined}>{item.label}</a>)}<a href="/Derfini_Resume.pdf" target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}>View resume (PDF)</a></nav>
        </SheetContent>
      </Sheet>
    </div><span className="topbar-progress" aria-hidden="true" /></header>

    <main id="main">
      <section id="home" className="hero"><div className="wrap">
        <div className="hero-meta"><span className="led" aria-hidden="true" />Engineering portfolio<span className="hero-fact"><MapPin size={15} />Coimbatore</span><span className="hero-fact"><BookOpen size={15} />B.E. ECE, 3rd year</span></div>
        <h1 className="hero-name"><span className="sr-only">Derfini C T</span>
          <span className="name-line" aria-hidden="true">{Array.from("Derfini").map((ch, i) => <span key={i} className="ltr" style={{ "--i": i } as CSSProperties}>{ch}</span>)}</span>
          <span className="name-line name-line-2" aria-hidden="true">{Array.from("C T").map((ch, i) => <span key={i} className="ltr" style={{ "--i": i + 7 } as CSSProperties}>{ch === " " ? " " : ch}</span>)}<span className="ltr name-dot" style={{ "--i": 10 } as CSSProperties}>.</span></span>
        </h1>
        <div className="hero-grid">
          <div><p className="hero-title">Electronics and Communication Engineering Student</p><p className="hero-intro">Exploring the connection between hardware and data. Building practical experience in embedded systems, electronics, and analytics.</p></div>
          <div className="hero-actions">
            <a className="btn btn-solid" href="/Derfini_Resume.pdf" target="_blank" rel="noopener noreferrer" data-magnetic><FileText size={17} />View resume<span className="sr-only"> (PDF, opens in a new tab)</span></a>
            <ExternalLink href={profile.linkedin} className="btn btn-ghost" magnetic><Linkedin size={17} />LinkedIn</ExternalLink>
            <ExternalLink href={profile.github} className="btn btn-ghost" magnetic><Github size={17} />GitHub</ExternalLink>
            <a className="text-link" href="#contact">Contact me</a>
          </div>
        </div>
        <div className="scope" onMouseLeave={() => setHovered(null)}>
          <div className="scope-screen"><Scope solo={solo} /><div className="scope-top" aria-hidden="true"><span>Curiosity. Connected to possibility.</span><span>Learn. Build. Refine.</span></div></div>
          <div className="channels" role="group" aria-label="My engineering focus">
            {interests.map(({ icon: Icon, title, text }, i) => <button type="button" key={title} className={`channel ch${i + 1}${solo === i ? " is-solo" : ""}`} aria-pressed={pinned === i} onMouseEnter={() => setHovered(i)} onFocus={() => setHovered(i)} onBlur={() => setHovered(null)} onClick={() => setPinned(p => (p === i ? null : i))}>
              <span className="ch-tag">CH{i + 1}</span><span className="ch-copy"><strong>{title}</strong><small>{text}</small></span><Icon size={18} strokeWidth={1.6} aria-hidden="true" />
            </button>)}
          </div>
        </div>
      </div></section>

      <div className="readouts" data-reveal><div className="wrap readout-grid">
        <div><strong><Count value={9.45} decimals={2} /><span className="unit">/10</span></strong><p>Academic CGPA</p></div>
        <div><strong><Count value={2} pad={2} /></strong><p>Industry internships</p></div>
        <div><strong>Power BI</strong><p>Solar PV analysis project</p></div>
        <div><strong>NPTEL Elite</strong><p>Adaptive signal processing</p></div>
      </div></div>

      <Section id="about" title="An engineering mindset. A drive to build." className="about">
        <div className="about-body">
          <p className="about-lead" ref={aboutRef} style={{ "--words": aboutWords.length } as CSSProperties}>{aboutWords.map((word, i) => <span key={i} style={{ "--i": i } as CSSProperties}>{word} </span>)}</p>
          <p>My interests span electronics, communication systems, embedded technology, and project development. Through internships in embedded systems and data analytics, I’ve worked with sensor data, real-time system concepts, and interactive dashboards that make information easier to understand.</p>
          <div className="about-note"><ShieldCheck size={20} aria-hidden="true" /><p>Interested in reliable embedded systems, hardware security, and technology that solves practical problems.</p></div>
        </div>
      </Section>

      <Section id="education" title="A strong foundation. Always learning.">
        <ol className="timeline">
          {education.map((stop, i) => <li key={stop.year} className={i === education.length - 1 ? "is-current" : ""} style={{ "--i": i } as CSSProperties}>
            <span className="tl-pad" aria-hidden="true" />
            <span className="tl-year">{stop.year}</span>
            <div className="tl-card"><p className="tl-level">{stop.level}</p><h3>{stop.school}</h3><p className="tl-detail">{stop.detail}</p>{stop.note && <p className="tl-note">{stop.note}</p>}<p className="tl-score"><strong><Count value={Number(stop.score)} decimals={stop.score.split(".")[1]?.length ?? 0} /></strong><span>{stop.unit}</span></p></div>
          </li>)}
        </ol>
      </Section>

      <Section id="skills" title="Across hardware, code, and data.">
        <div className="chips">{skillCategories.map(({ key, title, description }, index) => {
          const Icon = [Code2, Cpu, BarChart3, BookOpen][index];
          const items = content.skills.filter(skill => skill.category === key).map(skill => skill.name);
          return <article className="chip-card" key={key}>
            <header><h3>{title}</h3><p>{description}</p></header>
            {items.length ? <div className="chip">
              <div className="chip-body" aria-hidden="true"><span className="chip-notch" /><Icon size={22} strokeWidth={1.5} /></div>
              <ul className="chip-pins">{items.map((name, i) => <li key={name} style={{ "--i": i } as CSSProperties}><span className="lead" aria-hidden="true" />{name}</li>)}</ul>
            </div> : <p className="muted">Skills will appear here as they are added.</p>}
          </article>;
        })}</div>
        <div className="soft-skills"><div><h3>Communication & soft skills</h3><p>Experience presenting KPIs and business performance through stakeholder-facing data visualization.</p></div><p className="muted">Additional verified soft skills and examples: to be added.</p></div>
      </Section>

      <Section id="projects" title="Turning ideas into practice." intro="A project at the intersection of renewable energy and data analysis.">
        {content.projects.map(project => {
          const repository = safeWebUrl(project.github_url); const demo = safeWebUrl(project.demo_url);
          return <article className="project" key={project.id}>
            <div className="project-visual">{project.image_url ? <img src={project.image_url} alt={project.title} loading="lazy" /> : <><SolarIllustration /><p className="project-visual-label">{project.technologies[0] || "Project"}</p></>}</div>
            <div className="project-body">
              <h3>{project.title}</h3><p className="project-summary">{project.short_description}</p><Tags items={project.technologies} />
              <div className="project-details"><h4>Key features</h4><p>{project.full_description || "Detailed features, dataset, and outcomes: to be added."}</p></div>
              {(repository || demo) && <div className="project-links">{repository && <ExternalLink href={repository} className="btn btn-ghost" magnetic><Github size={16} />Repository</ExternalLink>}{demo && <ExternalLink href={demo} className="btn btn-ghost" magnetic><ArrowUpRight size={16} />Live demo</ExternalLink>}</div>}
            </div>
          </article>;
        })}
        {content.projects.length === 0 && <p className="muted">Projects will appear here as they are added.</p>}
      </Section>

      <Section id="experience" title="Learning through real applications.">
        <div className="modules">{content.experiences.map(experience => {
          const embedded = experience.title.toLowerCase().includes("embedded");
          const analytics = experience.title.toLowerCase().includes("analytics");
          const Icon = embedded ? Cpu : BarChart3;
          const category = embedded ? "Embedded systems" : analytics ? "Data analytics" : "Experience";
          const dates = experience.started_on ? `${formatMonth(experience.started_on)} to ${experience.ended_on ? formatMonth(experience.ended_on) : "present"}` : "Internship dates: to be added";
          return <article className={`module ${embedded ? "module-ch1" : "module-ch3"}`} key={experience.id}>
            <div className="module-strip"><span className="led" aria-hidden="true" /><span>{category}</span><Icon size={20} strokeWidth={1.5} aria-hidden="true" /></div>
            <h3>{experience.title}</h3><p className="module-org">{experience.organization || "Organization: to be added"}</p>
            <p className="module-desc">{experience.description}</p><Tags items={experience.technologies} /><p className="module-date">{dates}</p>
          </article>;
        })}</div>
        {content.experiences.length === 0 && <p className="muted">Experience will appear here as it is added.</p>}
      </Section>

      <Section id="certifications" title="Taking learning a step further.">
        {content.certifications.map(certificate => {
          const credential = safeWebUrl(certificate.credential_url);
          const score = certificate.score;
          return <article className="cert" key={certificate.id}>
            {score !== null ? <div className="gauge" style={{ "--score": score } as CSSProperties}>
              <svg viewBox="0 0 120 120" aria-hidden="true"><circle className="gauge-track" cx="60" cy="60" r="52" /><circle className="gauge-fill" cx="60" cy="60" r="52" pathLength="100" /></svg>
              <p><strong>{score}<span>%</span></strong><small>Course score</small></p>
            </div> : <div className="gauge gauge-empty"><Award size={40} strokeWidth={1.3} aria-hidden="true" /></div>}
            <div className="cert-body">
              {certificate.recognition && <span className="badge"><Award size={14} aria-hidden="true" />{certificate.recognition}</span>}
              <p className="cert-issuer">{certificate.issuer || "Issuer: to be added"}</p>
              <h3>{certificate.title}</h3>
              <p className="cert-desc">{certificate.description || (certificate.issued_on ? `Completed ${formatMonth(certificate.issued_on)}` : "Completion details: to be added")}</p>
              {credential && <ExternalLink href={credential} className="btn btn-ghost" magnetic><FileText size={16} />Certificate</ExternalLink>}
            </div>
          </article>;
        })}
        {content.certifications.length === 0 && <p className="muted">Certifications will appear here as they are added.</p>}
      </Section>

      <Section id="achievements" title="Milestones along the way.">
        <div className="wins">{content.achievements.map(achievement => {
          const Icon = achievement.title.toLowerCase().includes("academic") ? BookOpen : Award;
          const evidence = safeWebUrl(achievement.evidence_url);
          return <article className="win" key={achievement.id}><Icon size={22} strokeWidth={1.5} aria-hidden="true" /><strong>{achievement.recognition || achievement.event_name || "Achievement"}</strong><h3>{achievement.title}</h3><p>{achievement.description}</p>{evidence && <ExternalLink href={evidence} className="text-link">View details</ExternalLink>}</article>;
        })}<article className="win win-next"><Code2 size={22} strokeWidth={1.5} aria-hidden="true" /><strong>Next chapter</strong><h3>Hackathons & competitions</h3><p>Participation details, competitions, and additional academic achievements: to be added.</p></article></div>
      </Section>

      <section id="contact" className="sec contact" data-reveal><div className="wrap contact-grid">
        <div>
          <header className="sec-head"><span className="sec-trace" aria-hidden="true" /><h2>Let’s start a conversation.</h2></header>
          <p className="contact-intro">For engineering opportunities, project discussions, or a professional connection, reach me here.</p>
          <div className="contact-email-row"><a className="contact-email" href={`mailto:${profile.email}`}>{profile.email}</a><button type="button" className="icon-btn" onClick={() => copyEmail(setEmailCopied)} aria-label={emailCopied ? "Email address copied" : "Copy email address"}>{emailCopied ? <Check size={17} /> : <Copy size={17} />}</button></div>
          <div className="contact-links"><ExternalLink href={profile.linkedin} magnetic><Linkedin size={18} />LinkedIn</ExternalLink><ExternalLink href={profile.github} magnetic><Github size={18} />GitHub</ExternalLink></div>
          <p className="contact-note"><Mail size={16} aria-hidden="true" />Your next idea could start with a hello.</p>
        </div>
        <form className="form" onSubmit={prepareEmail}>
          <div className="form-row">
            <div className="field"><label htmlFor="name">Your name</label><input id="name" name="name" placeholder="Full name" required maxLength={100} autoComplete="name" /></div>
            <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" placeholder="you@company.com" required maxLength={254} autoComplete="email" /></div>
          </div>
          <div className="field"><label htmlFor="subject">Subject</label><input id="subject" name="subject" placeholder="What would you like to discuss?" maxLength={150} /></div>
          <div className="field"><label htmlFor="message">Message</label><textarea id="message" name="message" placeholder="Tell me a little about your opportunity or idea…" required minLength={10} maxLength={4000} rows={5} /></div>
          <button type="submit" className="btn btn-solid" data-magnetic><Send size={17} />Prepare email</button>
          <p className="form-help">Opens your email app with a draft. Send your message there.</p>
          {emailDraft && <div className="draft" role="status"><Check size={18} aria-hidden="true" /><div><p>Your email draft is ready. No message has been sent by this website.</p><a href={emailDraft} className="text-link">Open email draft again</a><button type="button" className="link-btn" onClick={() => copyEmail(setCopied)}>{copied ? "Email address copied" : "Copy email address"}</button></div></div>}
        </form>
      </div></section>
    </main>
    <footer className="footer"><div className="wrap footer-inner"><a className="brand" href="#home"><span className="brand-pad" aria-hidden="true" />Derfini C T</a><p>Electronics. Communication. Possibility.</p><span>© {new Date().getFullYear()} Derfini C T</span></div></footer>
  </div>;
}
