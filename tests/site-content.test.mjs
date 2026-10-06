import { test } from "node:test";
import assert from "node:assert/strict";
import { countable, defaultSiteContent, fullName, resolveSiteContent, siteContentSchema } from "../lib/portfolio/site.ts";

test("the built-in text is itself valid, so a fresh install saves cleanly", () => {
  assert.equal(siteContentSchema.safeParse(defaultSiteContent).success, true);
});

test("an empty or missing row shows the built-in text", () => {
  assert.deepEqual(resolveSiteContent(null), defaultSiteContent);
  assert.deepEqual(resolveSiteContent({}), defaultSiteContent);
});

test("a saved field replaces only itself", () => {
  const site = resolveSiteContent({ hero: { title: "Embedded engineer" } });
  assert.equal(site.hero.title, "Embedded engineer");
  assert.equal(site.hero.intro, defaultSiteContent.hero.intro);
  assert.deepEqual(site.education, defaultSiteContent.education);
});

test("a saved list replaces the whole default list, and items gain fields added later", () => {
  const site = resolveSiteContent({ education: [{ year: "2026", school: "M.E. VLSI" }] });
  assert.equal(site.education.length, 1);
  assert.deepEqual(site.education[0], { year: "2026", level: "", school: "M.E. VLSI", detail: "", score: "", unit: "", note: "" });
});

test("a field of the wrong type falls back instead of breaking the page", () => {
  const site = resolveSiteContent({ profile: { firstName: 42 }, nextChapter: { show: "yes" } });
  assert.equal(site.profile.firstName, "Derfini");
  assert.equal(site.nextChapter.show, true);
});

test("content that breaks a rule falls back to the built-in text as a whole", () => {
  const site = resolveSiteContent({ interests: [{ title: "Only one" }] });
  assert.deepEqual(site.interests, defaultSiteContent.interests);
});

test("the editor refuses an empty heading and a bad link", () => {
  const blankHeading = structuredClone(defaultSiteContent); blankHeading.sections.about.title = " ";
  assert.equal(siteContentSchema.safeParse(blankHeading).success, false);
  const badLink = structuredClone(defaultSiteContent); badLink.profile.linkedin = "javascript:alert(1)";
  assert.equal(siteContentSchema.safeParse(badLink).success, false);
  const drive = structuredClone(defaultSiteContent); drive.profile.resumeUrl = "https://drive.google.com/file/d/abc/view";
  assert.equal(siteContentSchema.safeParse(drive).success, true);
});

test("only plain numbers count up, keeping decimals and leading zeros", () => {
  assert.deepEqual(countable("9.45"), { value: 9.45, decimals: 2, pad: 0 });
  assert.deepEqual(countable("02"), { value: 2, decimals: 0, pad: 2 });
  assert.deepEqual(countable("84.0"), { value: 84, decimals: 1, pad: 0 });
  assert.equal(countable("Power BI"), null);
  assert.equal(countable("A+"), null);
});

test("the full name joins both parts and tolerates an empty second part", () => {
  assert.equal(fullName(defaultSiteContent.profile), "Derfini C T");
  assert.equal(fullName({ ...defaultSiteContent.profile, lastName: "" }), "Derfini");
});
