import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { defaultSiteContent } from "../lib/portfolio/site.ts";

// Next resolves extensionless TypeScript and JSON imports. Supply that resolution
// only while loading the real content module into Node's isolated test process.
const contentJson = new URL("../lib/portfolio/initial-content.json", import.meta.url).href;
const localLibrary = new URL("../lib/", import.meta.url).href;
const hook = registerHooks({
  resolve(specifier, context, nextResolve) {
    try { return nextResolve(specifier, context); }
    catch (error) {
      if (error.code === "ERR_MODULE_NOT_FOUND" && context.parentURL?.startsWith(localLibrary) && /^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context);
      throw error;
    }
  },
  load(url, context, nextLoad) {
    if (url === contentJson) return { format: "module", source: `export default ${readFileSync(new URL(url), "utf8")};`, shortCircuit: true };
    return nextLoad(url, context);
  },
});
let fallbackSkillCategories, includeSkillCategories;
try { ({ fallbackSkillCategories, includeSkillCategories } = await import("../lib/portfolio/content.ts")); }
finally { hook.deregister(); }

const category = (key, title, order = 0) => ({ id: `test-${key}`, key, title, description: `Description of ${title}`, display_order: order, created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-01T00:00:00Z" });

test("legacy fallback uses saved group headings and descriptions without mutating defaults", () => {
  const site = structuredClone(defaultSiteContent);
  site.skillGroups.technical = { title: "Electronics & chip design", description: "My saved technical focus." };
  const categories = fallbackSkillCategories(site);
  assert.deepEqual(categories.map(item => item.key), ["programming", "technical", "data", "tools"]);
  assert.equal(categories.find(item => item.key === "technical").title, "Electronics & chip design");
  assert.equal(categories.find(item => item.key === "technical").description, "My saved technical focus.");
  assert.equal(defaultSiteContent.skillGroups.technical.title, "Embedded & technical");
});

test("fetched categories retain custom order, headings, descriptions, and IDs", () => {
  const records = [category("chip-design", "VLSI & chip design", 2), category("programming", "Code foundations", 10)];
  const saved = structuredClone(records);
  const resolved = includeSkillCategories(records, [{ category: "programming" }, { category: "chip-design" }], defaultSiteContent);
  assert.deepEqual(resolved, saved);
  assert.deepEqual(records, saved);
  assert.notEqual(resolved, records);
});

test("a missing category is restored from saved legacy text so its skills remain visible", () => {
  const site = structuredClone(defaultSiteContent);
  site.skillGroups.technical = { title: "Hardware & VLSI", description: "A saved heading." };
  const resolved = includeSkillCategories([category("data", "Analytics")], [{ category: "technical" }], site);
  assert.deepEqual(resolved.map(item => item.key), ["data", "technical"]);
  assert.equal(resolved[1].title, "Hardware & VLSI");
  assert.equal(resolved[1].description, "A saved heading.");
});

test("a missing custom category stays visible and repeated skill references create only one group", () => {
  const resolved = includeSkillCategories([], [{ category: "rf-design" }, { category: "rf-design" }, { category: "chip-layout" }, { category: "chip-layout" }], defaultSiteContent);
  assert.deepEqual(resolved.map(item => item.key), ["rf-design", "chip-layout"]);
  assert.equal(resolved[0].title, "Rf design");
  assert.equal(new Set(resolved.map(item => item.key)).size, resolved.length);
});

test("an intentionally empty category list and empty skills stay empty", () => {
  assert.deepEqual(includeSkillCategories([], [], defaultSiteContent), []);
});

test("repeated skills never duplicate an existing custom category or overwrite its heading", () => {
  const existing = category("vlsi-design", "My VLSI focus", 4);
  const resolved = includeSkillCategories([existing], [{ category: "vlsi-design" }, { category: "vlsi-design" }], defaultSiteContent);
  assert.deepEqual(resolved, [existing]);
  assert.equal(resolved[0].title, "My VLSI focus");
});
