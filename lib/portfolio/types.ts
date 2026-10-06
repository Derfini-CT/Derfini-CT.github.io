export const skillCategories = [
  { key: "programming", title: "Programming", description: "Languages and core programming concepts." },
  { key: "technical", title: "Embedded & technical", description: "Practical experience through embedded systems work." },
  { key: "data", title: "Data & visualization", description: "Analysis and dashboards for meaningful reporting." },
  { key: "tools", title: "Software & tools", description: "Tools used for development, analysis, and productivity." },
] as const;
export type SkillCategory = typeof skillCategories[number]["key"];
export const projectStatuses = ["unspecified", "draft", "in_progress", "completed", "archived"] as const;
export const statusLabels: Record<typeof projectStatuses[number], string> = { unspecified: "Not specified", draft: "Draft", in_progress: "In progress", completed: "Completed", archived: "Archived" };
export interface Skill { id: string; name: string; category: SkillCategory; level: string | null; display_order: number; created_at: string; updated_at: string }
export interface Project { id: string; title: string; short_description: string; full_description: string; technologies: string[]; github_url: string | null; demo_url: string | null; image_path: string | null; status: typeof projectStatuses[number]; display_order: number; created_at: string; updated_at: string; image_url?: string | null }
export interface Certification { id: string; title: string; issuer: string | null; description: string; credential_url: string | null; issued_on: string | null; score: number | null; recognition: string | null; display_order: number; created_at: string; updated_at: string }
export interface Experience { id: string; title: string; organization: string | null; description: string; technologies: string[]; started_on: string | null; ended_on: string | null; display_order: number; created_at: string; updated_at: string }
export interface Achievement { id: string; title: string; description: string; event_name: string | null; recognition: string | null; achieved_on: string | null; evidence_url: string | null; display_order: number; created_at: string; updated_at: string }
export interface PortfolioContent { skills: Skill[]; projects: Project[]; certifications: Certification[]; experiences: Experience[]; achievements: Achievement[]; source: "supabase" | "snapshot" }
export interface PublicSupabaseConfig { url: string; anonKey: string }
export const projectImageBucket = "project-images";
