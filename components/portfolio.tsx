"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Award, BarChart3, BookOpen, Check, Code2, Cpu, FileText, Code2 as Github, Link2 as Linkedin, Mail, MapPin, Menu, Radio, Send, ShieldCheck } from "lucide-react";
import { skillCategories, type PortfolioContent } from "@/lib/portfolio/types";
import { safeWebUrl } from "@/lib/portfolio/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const profile = { name: "Derfini C T", email: "ctderfini@gmail.com", linkedin: "https://www.linkedin.com/in/derfini-c-t/", github: "https://github.com/Derfini-CT" };
const navigation = [{ id: "about", label: "About" }, { id: "education", label: "Education" }, { id: "skills", label: "Skills" }, { id: "projects", label: "Projects" }, { id: "experience", label: "Experience" }, { id: "certifications", label: "Certifications" }, { id: "achievements", label: "Achievements" }, { id: "contact", label: "Contact" }];
const interests = [{ icon: Cpu, title: "Embedded systems", text: "Real-time concepts & sensor data" }, { icon: Radio, title: "Electronics & communication", text: "Systems, signals & technology" }, { icon: BarChart3, title: "Data analytics", text: "From metrics to meaningful insights" }];

function SectionTitle({ number, label, title, text }: { number: string; label: string; title: string; text?: string }) {
  return <div className="section-heading"><p className="eyebrow"><span>{number}</span>{label}</p><h2>{title}</h2>{text && <p className="section-description">{text}</p>}</div>;
}
function ExternalLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{children}<span className="sr-only"> (opens in a new tab)</span></a>;
}
function Tags({ items }: { items: string[] }) { return <div className="flex flex-wrap gap-2">{items.map(item => <span className="tag" key={item}>{item}</span>)}</div>; }

function formatMonth(value: string) { return new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)); }

export default function Portfolio({ content }: { content: PortfolioContent }) {
  const [active, setActive] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [emailDraft, setEmailDraft] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("main section[id]"));
    const updateActive = () => {
      const marker = window.scrollY + 180;
      let current = "";
      sections.forEach(section => { if (section.offsetTop <= marker) current = section.id; });
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 20) current = "contact";
      setActive(current);
    };
    updateActive(); window.addEventListener("scroll", updateActive, { passive: true });
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); } }), { threshold: 0.08 });
    document.querySelectorAll(".reveal").forEach(item => observer.observe(item));
    return () => { window.removeEventListener("scroll", updateActive); observer.disconnect(); };
  }, []);
  function prepareEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const body = `Hello Derfini,\n\n${String(data.get("message")).trim()}\n\nFrom: ${String(data.get("name")).trim()}\nReply to: ${String(data.get("email")).trim()}`;
    const uri = `mailto:${profile.email}?subject=${encodeURIComponent(String(data.get("subject")).trim() || "Portfolio enquiry")}&body=${encodeURIComponent(body)}`;
    setEmailDraft(uri); setCopied(false); window.location.href = uri;
  }
  return <>
    <a href="#main" className="skip-link">Skip to content</a>
    <header className="site-header"><div className="container nav-shell">
      <a className="brand" href="#home" aria-label="Derfini C T, home">D<span className="brand-period">.</span><span className="brand-name">DERFINI C T</span></a>
      <nav aria-label="Main navigation" className="desktop-nav">{navigation.map(item => <a key={item.id} href={`#${item.id}`} className={active === item.id ? "active" : ""} aria-current={active === item.id ? "location" : undefined}>{item.label}</a>)}</nav>
      <Button asChild variant="outline" className="header-resume"><a href="/Derfini_Resume.pdf" target="_blank" rel="noopener noreferrer"><FileText />Resume<span className="sr-only"> (PDF, opens in a new tab)</span></a></Button>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}><SheetTrigger asChild><Button variant="outline" size="icon" className="mobile-menu" aria-label="Open navigation"><Menu /></Button></SheetTrigger><SheetContent className="mobile-sheet"><SheetHeader><SheetTitle>Derfini C T</SheetTitle><SheetDescription>Explore my engineering portfolio.</SheetDescription></SheetHeader><nav aria-label="Mobile navigation" className="mobile-nav">{navigation.map(item => <a key={item.id} href={`#${item.id}`} onClick={() => setMenuOpen(false)} aria-current={active === item.id ? "location" : undefined}>{item.label}</a>)}<a href="/Derfini_Resume.pdf" target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}>View resume (PDF)</a></nav></SheetContent></Sheet>
    </div></header>
    <main id="main">
      <section id="home" className="hero container"><div className="hero-copy">
        <p className="eyebrow hero-eyebrow">ENGINEERING PORTFOLIO</p><h1>Derfini <span>C T<span className="name-period">.</span></span></h1>
        <p className="hero-title">Electronics and Communication<br className="hidden sm:block" /> Engineering Student</p><p className="hero-intro">Exploring the connection between hardware and data. Building practical experience in embedded systems, electronics, and analytics.</p>
        <div className="hero-actions"><Button asChild className="button-main"><a href="/Derfini_Resume.pdf" target="_blank" rel="noopener noreferrer"><FileText />View Resume<span className="sr-only"> (PDF, opens in a new tab)</span></a></Button><Button asChild variant="outline" className="button-secondary"><ExternalLink href={profile.linkedin}><Linkedin />LinkedIn</ExternalLink></Button><Button asChild variant="outline" className="button-secondary"><ExternalLink href={profile.github}><Github />GitHub</ExternalLink></Button><a className="text-link" href="#contact">Contact Me</a></div>
        <div className="hero-facts"><span><MapPin size={16} />Coimbatore · College</span><span><BookOpen size={16} />B.E. ECE · 3rd year</span></div>
      </div><aside className="focus-panel" aria-label="Engineering interests"><div className="focus-header"><span className="mono-label">MY ENGINEERING FOCUS</span><Cpu size={25} strokeWidth={1.4} /></div><p className="focus-statement">Curiosity.<br />Connected to<br /><em>possibility.</em></p><div className="focus-list">{interests.map(({ icon: Icon, title, text }, i) => <div className="focus-item" key={title}><span className="focus-number">0{i + 1}</span><div><h3>{title}</h3><p>{text}</p></div><Icon size={20} strokeWidth={1.4} /></div>)}</div><div className="focus-footer"><span>LEARN. BUILD. REFINE.</span><span>ECE / CT</span></div></aside></section>
      <div className="credential-strip"><div className="container credential-grid"><div><strong>9.45<span>/10</span></strong><p>Academic CGPA</p></div><div><strong>02</strong><p>Industry internships</p></div><div><strong>Power BI</strong><p>Solar PV analysis project</p></div><div><strong>NPTEL Elite</strong><p>Adaptive signal processing</p></div></div></div>
      <section id="about" className="section container reveal"><div className="about-grid"><SectionTitle number="01" label="ABOUT ME" title="An engineering mindset. A drive to build." /><div className="about-copy"><p>I’m pursuing a B.E. in Electronics and Communication Engineering at V.S.B. College of Engineering Technical Campus, Coimbatore, with a CGPA of <strong>9.45/10</strong>.</p><p>My interests span electronics, communication systems, embedded technology, and project development. Through internships in embedded systems and data analytics, I’ve worked with sensor data, real-time system concepts, and interactive dashboards that make information easier to understand.</p><div className="about-note"><ShieldCheck /><p>Interested in reliable embedded systems, hardware security, and technology that solves practical problems.</p></div></div></div></section>
      <section id="education" className="section education-section"><div className="container reveal">
        <SectionTitle number="02" label="EDUCATION" title="A strong foundation. Always learning." />
        <article className="degree-card"><div className="degree-icon"><BookOpen size={30} strokeWidth={1.5} /></div><div className="degree-copy"><p className="category-label">UNDERGRADUATE · 3RD YEAR</p><h3>B.E. Electronics and Communication Engineering</h3><p>V.S.B. College of Engineering Technical Campus</p><span className="education-meta">Coimbatore · Expected graduation: <span>to be added</span></span></div><div className="degree-score"><strong>9.45<span>/10</span></strong><p>CGPA</p></div></article>
        <div className="school-grid"><article><div className="school-top"><span className="category-label">HIGHER SECONDARY</span><span>2024</span></div><h3>Christuraja Matric Hr. Sec. School</h3><p>Marthandam · HSC (12th standard)</p><strong>84.0<span>%</span></strong></article><article><div className="school-top"><span className="category-label">SECONDARY</span><span>2022</span></div><h3>Christuraja Matric Hr. Sec. School</h3><p>Marthandam · SSLC (10th standard)</p><strong>88.8<span>%</span></strong></article></div>
      </div></section>
      <section id="skills" className="section container reveal"><SectionTitle number="03" label="SKILLS & TOOLS" title="Across hardware, code, and data." />
        <div className="skills-grid">{skillCategories.map(({ key, title, description }, index) => { const Icon = [Code2, Cpu, BarChart3, BookOpen][index]; return <article className="skill-card" key={key}><Icon className="skill-icon" size={26} strokeWidth={1.6} /><h3>{title}</h3><p>{description}</p><Tags items={content.skills.filter(skill => skill.category === key).map(skill => skill.name)} /></article>; })}</div>
        <div className="communication-card"><div><h3>Communication & soft skills</h3><p>Experience presenting KPIs and business performance through stakeholder-facing data visualization.</p></div><p className="placeholder-note">Additional verified soft skills and examples: to be added.</p></div>
      </section>
      <section id="projects" className="section tinted-section"><div className="container reveal"><SectionTitle number="04" label="SELECTED PROJECT" title="Turning ideas into practice." text="A project at the intersection of renewable energy and data analysis." />
        {content.projects.map((project, index) => {
          const repository = safeWebUrl(project.github_url); const demo = safeWebUrl(project.demo_url);
          const isSolarProject = project.title === "Solar PV Plant Analysis";
          return <article className="project-card" key={project.id} style={index > 0 ? { marginTop: 24 } : undefined}>
            {project.image_url ? <div className="project-cover" style={{ padding: 0 }}><img src={project.image_url} alt={project.title} className="h-full min-h-[360px] w-full object-cover" loading="lazy" /></div> : <div className="project-cover"><span className="mono-label">PROJECT / {String(index + 1).padStart(2, "0")}</span><BarChart3 className="project-icon" size={68} strokeWidth={1.2} /><div><p>{isSolarProject ? "DATA ANALYTICS" : "ENGINEERING PROJECT"}</p><strong>{project.technologies[0] || "Project"}<span>{isSolarProject ? "Solar PV" : project.title}</span></strong></div></div>}
            <div className="project-content"><div className="project-topline"><span className="category-label">{isSolarProject ? "ANALYTICS PROJECT" : "PROJECT"}</span><span className="project-index">{String(index + 1).padStart(2, "0")}</span></div><h3>{project.title}</h3><p>{project.short_description}</p><Tags items={project.technologies} /><div className="project-details"><span>KEY FEATURES</span><p className="whitespace-pre-line">{project.full_description || "Detailed features, dataset, and outcomes: to be added."}</p></div><div className="project-links">{repository ? <Button asChild variant="outline"><ExternalLink href={repository}><Github />Repository</ExternalLink></Button> : <Button variant="outline" disabled><Github />Repository · add link</Button>}{demo ? <Button asChild variant="outline"><ExternalLink href={demo}><BarChart3 />Live demo</ExternalLink></Button> : <Button variant="outline" disabled><BarChart3 />Demo · add link</Button>}</div></div>
          </article>;
        })}
        {content.projects.length === 0 && <p className="section-description">Projects will appear here as they are added.</p>}
      </div></section>
      <section id="experience" className="section container reveal"><SectionTitle number="05" label="INTERNSHIP EXPERIENCE" title="Learning through real applications." />
        <div className="experience-grid">{content.experiences.map(experience => {
          const embedded = experience.title.toLowerCase().includes("embedded");
          const analytics = experience.title.toLowerCase().includes("analytics");
          const Icon = embedded ? Cpu : BarChart3;
          const category = embedded ? "EMBEDDED SYSTEMS" : analytics ? "DATA ANALYTICS" : "EXPERIENCE";
          const dates = experience.started_on ? `${formatMonth(experience.started_on)} · ${experience.ended_on ? formatMonth(experience.ended_on) : "Present"}` : "Internship dates: to be added";
          return <article className="experience-card" key={experience.id}><div className="experience-top"><Icon size={26} strokeWidth={1.5} /><span>{category}</span></div><h3>{experience.title}</h3><p className="organization">{experience.organization || "Organization: to be added"}</p><p className="experience-description">{experience.description}</p><Tags items={experience.technologies} /><p className="experience-date">{dates}</p></article>;
        })}</div>
        {content.experiences.length === 0 && <p className="section-description">Experience will appear here as it is added.</p>}
      </section>
      <section id="certifications" className="section certification-section"><div className="container reveal"><SectionTitle number="06" label="CERTIFICATIONS" title="Taking learning a step further." />
        {content.certifications.map((certificate, index) => {
          const credential = safeWebUrl(certificate.credential_url);
          return <article className="certificate-card" key={certificate.id} style={index > 0 ? { marginTop: 24 } : undefined}><div className="certificate-icon"><Award size={38} strokeWidth={1.4} /></div><div className="certificate-content"><p className="category-label">{certificate.issuer?.toUpperCase() || "Issuer: to be added"}</p><h3>{certificate.title}</h3><p>{certificate.description || (certificate.issued_on ? `Completed ${formatMonth(certificate.issued_on)}` : "Completion details: to be added")}</p>{credential ? <Button asChild variant="outline" className="certificate-link"><ExternalLink href={credential}><FileText />Certificate</ExternalLink></Button> : <Button variant="outline" disabled className="certificate-link"><FileText />Certificate · add link</Button>}</div><div className="certificate-result">{certificate.recognition && <span className="elite-badge"><Award size={15} />{certificate.recognition.toUpperCase()}</span>}{certificate.score !== null && <><strong>{certificate.score}<span>%</span></strong><p>Course score</p></>}</div></article>;
        })}
        {content.certifications.length === 0 && <p className="section-description">Certifications will appear here as they are added.</p>}
      </div></section>
      <section id="achievements" className="section container reveal"><SectionTitle number="07" label="ACHIEVEMENTS & HACKATHONS" title="Milestones along the way." />
        <div className="achievement-grid">{content.achievements.map(achievement => {
          const Icon = achievement.title.toLowerCase().includes("academic") ? BookOpen : Award;
          const evidence = safeWebUrl(achievement.evidence_url);
          return <article className="achievement-card" key={achievement.id}><Icon size={24} strokeWidth={1.5} /><strong>{achievement.recognition || achievement.event_name || "Achievement"}</strong><h3>{achievement.title}</h3><p>{achievement.description}</p>{evidence && <ExternalLink href={evidence} className="text-link">View details</ExternalLink>}</article>;
        })}<article className="achievement-card placeholder-card"><Code2 size={24} strokeWidth={1.5} /><strong>Next chapter</strong><h3>Hackathons & competitions</h3><p>Participation details, competitions, and additional academic achievements: to be added.</p></article></div>
      </section>
      <section id="contact" className="section contact-section"><div className="container contact-grid reveal"><div><SectionTitle number="08" label="GET IN TOUCH" title="Let’s start a conversation." /><p className="contact-intro">For engineering opportunities, project discussions, or a professional connection, reach me here.</p><a className="contact-email" href={`mailto:${profile.email}`}>{profile.email}</a><div className="contact-links"><ExternalLink href={profile.linkedin}><Linkedin size={19} />LinkedIn</ExternalLink><ExternalLink href={profile.github}><Github size={19} />GitHub</ExternalLink></div><p className="contact-note"><Mail size={16} />Your next idea could start with a hello.</p></div>
        <form className="contact-form" onSubmit={prepareEmail}><div className="form-row"><div><label htmlFor="name">Your name</label><Input id="name" name="name" placeholder="Full name" required maxLength={100} autoComplete="name" /></div><div><label htmlFor="email">Email address</label><Input id="email" name="email" type="email" placeholder="you@company.com" required maxLength={254} autoComplete="email" /></div></div><div><label htmlFor="subject">Subject</label><Input id="subject" name="subject" placeholder="What would you like to discuss?" maxLength={150} /></div><div><label htmlFor="message">Message</label><Textarea id="message" name="message" placeholder="Tell me a little about your opportunity or idea…" required minLength={10} maxLength={4000} rows={5} /></div><Button type="submit" className="button-main"><Send />Prepare email</Button><p className="form-help">Opens your email app with a draft. Send your message there.</p>{emailDraft && <div className="draft-feedback" role="status"><Check size={18} /><div><p>Your email draft is ready. No message has been sent by this website.</p><a href={emailDraft} className="text-link">Open email draft again</a><Button type="button" variant="link" onClick={async () => { try { await navigator.clipboard.writeText(profile.email); setCopied(true); } catch { setCopied(false); } }}>{copied ? "Email address copied" : "Copy email address"}</Button></div></div>}</form>
      </div></section>
    </main><footer className="site-footer"><div className="container footer-inner"><a className="footer-brand" href="#home">Derfini C T<span>.</span></a><p>Electronics. Communication. Possibility.</p><span>© {new Date().getFullYear()} Derfini C T</span></div></footer>
  </>;
}
