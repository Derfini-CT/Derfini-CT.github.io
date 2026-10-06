import { z } from "zod";
import { projectStatuses } from "./types";

export function safeWebUrl(value: string | null | undefined) {
  if (!value) return null;
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; }
}
const optionalUrl = z.string().max(2048).nullable().refine(value => value === null || safeWebUrl(value) !== null, "Use a valid http or https URL.");
export const skillInputSchema = z.object({ name: z.string().trim().min(1, "Enter a skill name.").max(100), category: z.enum(["programming", "technical", "data", "tools"]), level: z.string().trim().min(1).max(100).nullable(), display_order: z.number().int().nonnegative() });
export const projectInputSchema = z.object({ title: z.string().trim().min(1, "Enter a project title.").max(200), short_description: z.string().trim().min(1, "Enter a short description.").max(1000), full_description: z.string().trim().max(10000), technologies: z.array(z.string().trim().min(1).max(100)).max(30), github_url: optionalUrl, demo_url: optionalUrl, image_path: z.string().regex(/^projects\/[0-9a-f-]{36}\.(png|jpg|jpeg|webp)$/).nullable(), status: z.enum(projectStatuses), display_order: z.number().int().nonnegative() });
export function validateProjectImage(file: Pick<File, "size" | "type" | "name">) {
  const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  const extension = extensions[file.type];
  if (!extension || !/\.(jpe?g|png|webp)$/i.test(file.name)) throw new Error("Choose a JPEG, PNG, or WebP image.");
  if (file.size === 0 || file.size > 5 * 1024 * 1024) throw new Error("Images must be between 1 byte and 5 MB.");
  return extension;
}
const optionalText = (max: number) => z.string().trim().min(1).max(max).nullable();
const optionalDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a full date.").nullable();
export const certificationInputSchema = z.object({ title: z.string().trim().min(1, "Enter a certification title.").max(200), issuer: optionalText(200), description: z.string().trim().max(10000), credential_url: optionalUrl, issued_on: optionalDate, score: z.number().min(0, "Scores run from 0 to 100.").max(100, "Scores run from 0 to 100.").nullable(), recognition: optionalText(100), display_order: z.number().int().nonnegative() });
export const experienceInputSchema = z.object({ title: z.string().trim().min(1, "Enter a role title.").max(200), organization: optionalText(200), description: z.string().trim().max(10000), technologies: z.array(z.string().trim().min(1).max(100)).max(30), started_on: optionalDate, ended_on: optionalDate, display_order: z.number().int().nonnegative() })
  .refine(value => !value.started_on || !value.ended_on || value.ended_on >= value.started_on, { message: "The end date must be on or after the start date.", path: ["ended_on"] });
export const achievementInputSchema = z.object({ title: z.string().trim().min(1, "Enter an achievement title.").max(200), description: z.string().trim().max(10000), event_name: optionalText(200), recognition: optionalText(100), achieved_on: optionalDate, evidence_url: optionalUrl, display_order: z.number().int().nonnegative() });
