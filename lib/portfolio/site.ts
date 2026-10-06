import { z } from "zod";

// Everything on the public page that is not a database list lives in one JSON document
// (public.site_content, row id 1). Defaults are the text the page shipped with, so a
// missing table, an empty row or a field added later all fall back to real content.

const text = (max: number) => z.string().max(max);
const required = (max: number, message: string) => z.string().trim().min(1, message).max(max);
const webUrl = z.string().trim().max(2048).refine(value => {
  if (!value) return true;
  try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:"; } catch { return false; }
}, "Use a full link starting with https://");
// The resume may be a file on this site ("/Derfini_Resume.pdf") or a full link.
const linkOrPath = z.string().trim().max(2048).refine(value => !value || value.startsWith("/") || /^https?:\/\/\S+$/.test(value), "Use a link starting with https:// or a site path starting with /");

const heading = z.object({ title: required(160, "Every section needs a heading."), intro: text(600) });

export const siteContentSchema = z.object({
  profile: z.object({
    firstName: required(40, "Enter your first name."),
    lastName: text(40),
    email: z.string().trim().email("Enter a valid email address.").max(254),
    linkedin: webUrl,
    github: webUrl,
    resumeUrl: linkOrPath,
    location: text(80),
    studyLine: text(80),
  }),
  hero: z.object({
    kicker: text(80),
    title: required(160, "Enter a headline under your name."),
    intro: text(600),
    scopeLeft: text(80),
    scopeRight: text(80),
  }),
  highlights: z.array(z.object({ value: required(24, "Each highlight needs a value."), unit: text(16), label: text(80) })).max(6),
  interests: z.array(z.object({ title: required(60, "Each focus area needs a title."), text: text(120) })).length(3),
  about: z.object({ lead: required(600, "Enter the opening paragraph."), body: text(3000), note: text(400) }),
  education: z.array(z.object({
    year: required(12, "Each education stop needs a year."),
    level: text(80), school: required(160, "Each education stop needs a school or degree."),
    detail: text(200), score: text(12), unit: text(16), note: text(200),
  })).max(8),
  skillGroups: z.object({
    programming: z.object({ title: required(60, "Name every skill group."), description: text(200) }),
    technical: z.object({ title: required(60, "Name every skill group."), description: text(200) }),
    data: z.object({ title: required(60, "Name every skill group."), description: text(200) }),
    tools: z.object({ title: required(60, "Name every skill group."), description: text(200) }),
  }),
  softSkills: z.object({ title: text(80), text: text(600), note: text(300) }),
  nextChapter: z.object({ show: z.boolean(), label: text(40), title: text(120), text: text(400) }),
  sections: z.object({
    about: heading, education: heading, skills: heading, projects: heading,
    experience: heading, certifications: heading, achievements: heading, contact: heading,
  }),
  contact: z.object({ note: text(160) }),
  footer: z.object({ tagline: text(120) }),
});
export type SiteContent = z.infer<typeof siteContentSchema>;

export const defaultSiteContent: SiteContent = {
  profile: {
    firstName: "Derfini", lastName: "C T", email: "ctderfini@gmail.com",
    linkedin: "https://www.linkedin.com/in/derfini-c-t/", github: "https://github.com/Derfini-CT",
    resumeUrl: "/Derfini_Resume.pdf", location: "Coimbatore", studyLine: "B.E. ECE, 3rd year",
  },
  hero: {
    kicker: "Engineering portfolio",
    title: "Electronics and Communication Engineering Student",
    intro: "Exploring the connection between hardware and data. Building practical experience in embedded systems, electronics, and analytics.",
    scopeLeft: "Curiosity. Connected to possibility.", scopeRight: "Learn. Build. Refine.",
  },
  highlights: [
    { value: "9.45", unit: "/10", label: "Academic CGPA" },
    { value: "02", unit: "", label: "Industry internships" },
    { value: "Power BI", unit: "", label: "Solar PV analysis project" },
    { value: "NPTEL Elite", unit: "", label: "Adaptive signal processing" },
  ],
  interests: [
    { title: "Embedded systems", text: "Real-time concepts & sensor data" },
    { title: "Electronics & communication", text: "Systems, signals & technology" },
    { title: "Data analytics", text: "From metrics to meaningful insights" },
  ],
  about: {
    lead: "I’m pursuing a B.E. in Electronics and Communication Engineering at V.S.B. College of Engineering Technical Campus, Coimbatore, with a CGPA of 9.45/10.",
    body: "My interests span electronics, communication systems, embedded technology, and project development. Through internships in embedded systems and data analytics, I’ve worked with sensor data, real-time system concepts, and interactive dashboards that make information easier to understand.",
    note: "Interested in reliable embedded systems, hardware security, and technology that solves practical problems.",
  },
  education: [
    { year: "2022", level: "Secondary", school: "Christuraja Matric Hr. Sec. School", detail: "Marthandam, SSLC (10th standard)", score: "88.8", unit: "%", note: "" },
    { year: "2024", level: "Higher secondary", school: "Christuraja Matric Hr. Sec. School", detail: "Marthandam, HSC (12th standard)", score: "84.0", unit: "%", note: "" },
    { year: "Now", level: "Undergraduate, 3rd year", school: "B.E. Electronics and Communication Engineering", detail: "V.S.B. College of Engineering Technical Campus, Coimbatore", score: "9.45", unit: "/10 CGPA", note: "Expected graduation: to be added" },
  ],
  skillGroups: {
    programming: { title: "Programming", description: "Languages and core programming concepts." },
    technical: { title: "Embedded & technical", description: "Practical experience through embedded systems work." },
    data: { title: "Data & visualization", description: "Analysis and dashboards for meaningful reporting." },
    tools: { title: "Software & tools", description: "Tools used for development, analysis, and productivity." },
  },
  softSkills: {
    title: "Communication & soft skills",
    text: "Experience presenting KPIs and business performance through stakeholder-facing data visualization.",
    note: "Additional verified soft skills and examples: to be added.",
  },
  nextChapter: { show: true, label: "Next chapter", title: "Hackathons & competitions", text: "Participation details, competitions, and additional academic achievements: to be added." },
  sections: {
    about: { title: "An engineering mindset. A drive to build.", intro: "" },
    education: { title: "A strong foundation. Always learning.", intro: "" },
    skills: { title: "Across hardware, code, and data.", intro: "" },
    projects: { title: "Turning ideas into practice.", intro: "A project at the intersection of renewable energy and data analysis." },
    experience: { title: "Learning through real applications.", intro: "" },
    certifications: { title: "Taking learning a step further.", intro: "" },
    achievements: { title: "Milestones along the way.", intro: "" },
    contact: { title: "Let’s start a conversation.", intro: "For engineering opportunities, project discussions, or a professional connection, reach me here." },
  },
  contact: { note: "Your next idea could start with a hello." },
  footer: { tagline: "Electronics. Communication. Possibility." },
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

function blank(value: unknown): unknown {
  if (isPlainObject(value)) return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, blank(inner)]));
  if (Array.isArray(value)) return [];
  return typeof value === "string" ? "" : typeof value === "boolean" ? false : typeof value === "number" ? 0 : value;
}

// Stored values win field by field; arrays replace the default list whole. Any stored
// field of the wrong type is dropped, so one bad value cannot blank the page.
function mergeInto(base: unknown, stored: unknown): unknown {
  if (isPlainObject(base)) {
    if (!isPlainObject(stored)) return base;
    return Object.fromEntries(Object.entries(base).map(([key, value]) => [key, mergeInto(value, stored[key])]));
  }
  if (Array.isArray(base)) {
    if (!Array.isArray(stored)) return base;
    // New items take their shape from the first default, emptied, so a missing field
    // reads as blank rather than borrowing that default item's text.
    const template = base[0];
    return template === undefined ? stored : stored.map(item => mergeInto(blank(template), item));
  }
  return typeof stored === typeof base ? stored : base;
}

export function resolveSiteContent(stored: unknown): SiteContent {
  const merged = mergeInto(defaultSiteContent, stored);
  const parsed = siteContentSchema.safeParse(merged);
  return parsed.success ? parsed.data : defaultSiteContent;
}

export function fullName(profile: SiteContent["profile"]) {
  return [profile.firstName, profile.lastName].filter(Boolean).join(" ");
}

// A highlight or score counts up only when it is a plain number; "02" keeps its padding.
export function countable(value: string) {
  const trimmed = value.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  const decimals = trimmed.split(".")[1]?.length ?? 0;
  const pad = decimals === 0 && trimmed.length > 1 && trimmed.startsWith("0") ? trimmed.length : 0;
  return { value: Number(trimmed), decimals, pad };
}
