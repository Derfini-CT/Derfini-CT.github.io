import { z } from "zod";

// Everything on the public page that is not a database list lives in one JSON document
// (public.site_content, row id 1). Defaults are the text the page shipped with, so a
// missing table, an empty row or a field added later all fall back to real content.

const text = (max: number) => z.string().max(max);
const required = (max: number, message: string) => z.string().trim().min(1, message).max(max);
const webUrl = z.string().trim().max(2048).refine(value => {
  if (!value) return true;
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password; } catch { return false; }
}, "Use a full link starting with https://");
// The resume may be a file on this site ("/Derfini_Resume.pdf") or a full link.
const linkOrPath = z.string().trim().max(2048).refine(value => {
  if (!value || (value.startsWith("/") && !value.startsWith("//") && !/[\\\s]/.test(value))) return true;
  return webUrl.safeParse(value).success;
}, "Use a link starting with https:// or a site path starting with /");
const photoPath = z.string().refine(value => !value || /^profile\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|jpeg|webp)$/.test(value), "Choose a profile image using the upload field.");

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
    photoPath,
    photoAlt: text(160),
    showPhoto: z.boolean(),
  }),
  hero: z.object({
    kicker: text(80),
    title: required(160, "Enter a headline under your name."),
    intro: text(600),
    scopeLeft: text(80),
    scopeRight: text(80),
    nameSize: z.enum(["balanced", "large"]),
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
  labels: z.object({
    nav: z.object({ about: required(40, "Enter a navigation label."), education: required(40, "Enter a navigation label."), skills: required(40, "Enter a navigation label."), projects: required(40, "Enter a navigation label."), experience: required(40, "Enter a navigation label."), certifications: required(40, "Enter a navigation label."), achievements: required(40, "Enter a navigation label."), contact: required(40, "Enter a navigation label.") }),
    actions: z.object({ resume: text(80), viewResume: text(80), linkedin: text(80), github: text(80), contactMe: text(80), repository: text(80), liveDemo: text(80), keyFeatures: text(80), certificate: text(80), viewDetails: text(80) }),
    form: z.object({ nameLabel: text(80), namePlaceholder: text(160), emailLabel: text(80), emailPlaceholder: text(160), subjectLabel: text(80), subjectPlaceholder: text(160), messageLabel: text(80), messagePlaceholder: text(300), submit: text(80), help: text(400), draftReady: text(400), openDraft: text(80), copyEmail: text(80), emailCopied: text(80), defaultSubject: text(150), greeting: text(80), from: text(80), replyTo: text(80) }),
    fallback: z.object({ skills: text(300), projects: text(300), experience: text(300), certifications: text(300), project: text(80), projectDetails: text(1000), organization: text(160), experienceDates: text(160), present: text(40), experienceCategory: text(80), embeddedCategory: text(80), analyticsCategory: text(80), issuer: text(160), completionDetails: text(300), completed: text(80), courseScore: text(80), achievement: text(80), mobileDescription: text(200) }),
  }),
});
export type SiteContent = z.infer<typeof siteContentSchema>;

export const defaultSiteContent: SiteContent = {
  "hero": {
    "intro": "Building practical skills in embedded systems, programming, and data analytics, while exploring VLSI, digital design, and semiconductor technology.",
    "title": "Electronics and Communication Engineering Student",
    "kicker": "Engineering portfolio",
    "nameSize": "balanced",
    "scopeLeft": "Curiosity. Connected to possibility.",
    "scopeRight": "Learn. Build. Refine."
  },
  "about": {
    "body": "My interests span embedded systems, electronics, communication systems, and semiconductor technology. Through internships at Codtech IT Solutions and Feather Softwares, I have developed Arduino projects, worked with sensor data, and built interactive dashboards. I use Python and Java in my programming work and am currently learning VLSI and digital design fundamentals as part of my academic curriculum.",
    "lead": "I’m pursuing a B.E. in Electronics and Communication Engineering at V.S.B. College of Engineering Technical Campus, Coimbatore, with a CGPA of 9.45/10.",
    "note": "Open to internship opportunities and technical projects where I can learn, contribute, and apply engineering concepts to practical problems."
  },
  "footer": {
    "tagline": "Electronics. Communication. Possibility."
  },
  "labels": {
    "nav": {
      "about": "About",
      "skills": "Skills",
      "contact": "Contact",
      "projects": "Projects",
      "education": "Education",
      "experience": "Experience",
      "achievements": "Achievements",
      "certifications": "Certifications"
    },
    "form": {
      "from": "From",
      "help": "Opens your email app with a draft. Send your message there.",
      "submit": "Prepare email",
      "replyTo": "Reply to",
      "greeting": "Hello",
      "copyEmail": "Copy email address",
      "nameLabel": "Your name",
      "openDraft": "Open email draft again",
      "draftReady": "Your email draft is ready. No message has been sent by this website.",
      "emailLabel": "Email address",
      "emailCopied": "Email address copied",
      "messageLabel": "Message",
      "subjectLabel": "Subject",
      "defaultSubject": "Portfolio enquiry",
      "namePlaceholder": "Full name",
      "emailPlaceholder": "you@company.com",
      "messagePlaceholder": "Tell me a little about your opportunity or idea…",
      "subjectPlaceholder": "What would you like to discuss?"
    },
    "actions": {
      "github": "GitHub",
      "resume": "Resume",
      "linkedin": "LinkedIn",
      "liveDemo": "View demo",
      "contactMe": "Contact me",
      "repository": "Repository",
      "viewResume": "View resume",
      "certificate": "Certificate",
      "keyFeatures": "Key features",
      "viewDetails": "View details"
    },
    "fallback": {
      "issuer": "Issuer: to be added",
      "skills": "Skills will appear here as they are added.",
      "present": "present",
      "project": "Project",
      "projects": "Projects will appear here as they are added.",
      "completed": "Completed",
      "experience": "Experience will appear here as it is added.",
      "achievement": "Achievement",
      "courseScore": "Course score",
      "organization": "Organization: to be added",
      "certifications": "Certifications will appear here as they are added.",
      "projectDetails": "",
      "experienceDates": "",
      "embeddedCategory": "Embedded systems",
      "analyticsCategory": "Data analytics",
      "completionDetails": "Completion details: to be added",
      "mobileDescription": "Explore my engineering portfolio.",
      "experienceCategory": "Experience"
    }
  },
  "contact": {
    "note": "Your next idea could start with a hello."
  },
  "profile": {
    "email": "ctderfini@gmail.com",
    "github": "https://github.com/Derfini-CT",
    "lastName": "C T",
    "linkedin": "https://www.linkedin.com/in/derfini-c-t/",
    "location": "Coimbatore",
    "photoAlt": "Derfini C T — professional portrait",
    "firstName": "Derfini",
    "photoPath": "profile/ad37f621-1de0-4498-9d8e-41e1eaef942a.jpg",
    "resumeUrl": "/Derfini_Resume.pdf",
    "showPhoto": true,
    "studyLine": "B.E. ECE, 3rd year"
  },
  "sections": {
    "about": {
      "intro": "",
      "title": "An engineering mindset. A drive to build."
    },
    "skills": {
      "intro": "",
      "title": "Across hardware, code, and data."
    },
    "contact": {
      "intro": "For engineering opportunities, project discussions, or a professional connection, reach me here.",
      "title": "Let’s start a conversation."
    },
    "projects": {
      "intro": "Projects spanning embedded systems, Arduino applications, and renewable energy analytics.",
      "title": "Turning ideas into practice."
    },
    "education": {
      "intro": "",
      "title": "A strong foundation. Always learning."
    },
    "experience": {
      "intro": "",
      "title": "Learning through real applications."
    },
    "achievements": {
      "intro": "",
      "title": "Milestones along the way."
    },
    "certifications": {
      "intro": "",
      "title": "Taking learning a step further."
    }
  },
  "education": [
    {
      "note": "",
      "unit": "%",
      "year": "2022",
      "level": "Secondary",
      "score": "88.8",
      "detail": "Marthandam, SSLC (10th standard)",
      "school": "Christuraja Matric Hr. Sec. School"
    },
    {
      "note": "",
      "unit": "%",
      "year": "2024",
      "level": "Higher secondary",
      "score": "84.0",
      "detail": "Marthandam, HSC (12th standard)",
      "school": "Christuraja Matric Hr. Sec. School"
    },
    {
      "note": "Expected graduation: May 2028 · SGPA: Semester 1 — 8.91; Semester 2 — 9.23; Semester 3 — 9.88; Semester 4 — 9.82.",
      "unit": "/10 CGPA",
      "year": "2024–2028",
      "level": "Undergraduate, 3rd year",
      "score": "9.45",
      "detail": "V.S.B. College of Engineering Technical Campus, Coimbatore",
      "school": "B.E. Electronics and Communication Engineering"
    }
  ],
  "interests": [
    {
      "text": "Real-time concepts & sensor data",
      "title": "Embedded systems"
    },
    {
      "text": "Systems, signals & technology",
      "title": "Electronics & communication"
    },
    {
      "text": "From metrics to meaningful insights",
      "title": "Data analytics"
    }
  ],
  "highlights": [
    {
      "unit": "/10",
      "label": "Academic CGPA",
      "value": "9.45"
    },
    {
      "unit": "",
      "label": "Industry internships",
      "value": "02"
    },
    {
      "unit": "",
      "label": "Solar PV analysis project",
      "value": "Power BI"
    },
    {
      "unit": "",
      "label": "Adaptive signal processing",
      "value": "NPTEL Elite"
    }
  ],
  "softSkills": {
    "note": "",
    "text": "Problem-solving through regular coding practice; teamwork and creative thinking through hackathon participation; and communication through stakeholder-focused dashboard reporting.",
    "title": "Communication & soft skills"
  },
  "nextChapter": {
    "show": false,
    "text": "Participation details, competitions, and additional academic achievements: to be added.",
    "label": "Next chapter",
    "title": "Hackathons & competitions"
  },
  "skillGroups": {
    "data": {
      "title": "Data & visualization",
      "description": "Analysis and dashboards for meaningful reporting."
    },
    "tools": {
      "title": "Software & tools",
      "description": "Tools used for development, analysis, and productivity."
    },
    "technical": {
      "title": "Embedded & technical",
      "description": "Practical experience through embedded systems work."
    },
    "programming": {
      "title": "Programming",
      "description": "Languages and core programming concepts."
    }
  }
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
  // Repair only invalid branches. A malformed image path or one overlong field
  // must not replace a visitor's otherwise valid saved name, marks, or biography.
  function resolve(schema: z.ZodTypeAny, value: unknown, fallback: unknown): unknown {
    const parsed = schema.safeParse(value);
    if (parsed.success) return parsed.data;
    if (schema instanceof z.ZodObject && isPlainObject(value) && isPlainObject(fallback)) {
      return Object.fromEntries(Object.entries(schema.shape).map(([key, field]) => [key, resolve(field as z.ZodTypeAny, value[key], fallback[key])]));
    }
    if (schema instanceof z.ZodArray && Array.isArray(value) && Array.isArray(fallback)) {
      const repaired = value.flatMap((item, index) => {
        const repairedItem = schema.element.safeParse(resolve(schema.element, item, fallback[index] ?? blank(fallback[0])));
        return repairedItem.success ? [repairedItem.data] : [];
      });
      const list = schema.safeParse(repaired);
      return list.success ? list.data : fallback;
    }
    return fallback;
  }
  const repaired = siteContentSchema.safeParse(resolve(siteContentSchema, merged, defaultSiteContent));
  return repaired.success ? repaired.data : defaultSiteContent;
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
