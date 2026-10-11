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

test("an invalid fixed-length list falls back without discarding other saved content", () => {
  const site = resolveSiteContent({ profile: { firstName: "Saved name" }, interests: [{ title: "Only one" }] });
  assert.deepEqual(site.interests, defaultSiteContent.interests);
  assert.equal(site.profile.firstName, "Saved name");
});

test("an invalid saved field cannot reset a valid biography or education score", () => {
  const site = resolveSiteContent({
    profile: { firstName: "Saved name", linkedin: "javascript:alert(1)" },
    hero: { title: "x".repeat(161) },
    about: { lead: "My saved professional introduction." },
    education: [{ year: "2026", school: "My degree", score: "9.61", unit: "/10" }],
  });
  assert.equal(site.profile.firstName, "Saved name");
  assert.equal(site.profile.linkedin, defaultSiteContent.profile.linkedin);
  assert.equal(site.hero.title, defaultSiteContent.hero.title);
  assert.equal(site.about.lead, "My saved professional introduction.");
  assert.equal(site.education[0].score, "9.61");
});

test("older saved content gains photo, typography and interface fields without inventing a photo", () => {
  const site = resolveSiteContent({ profile: { firstName: "Saved name" }, labels: { nav: { about: "Profile" } } });
  assert.equal(site.profile.firstName, "Saved name");
  assert.equal(site.profile.photoPath, "");
  assert.equal(site.profile.showPhoto, false);
  assert.equal(site.hero.nameSize, "balanced");
  assert.equal(site.labels.nav.about, "Profile");
  assert.equal(site.labels.form.submit, "Prepare email");
});

test("a malformed additional education item cannot discard saved scores", () => {
  const education = structuredClone(defaultSiteContent.education);
  education[0].score = "91.2";
  education.push({ school: "Missing required year" });
  const site = resolveSiteContent({ education });
  assert.equal(site.education.length, 3);
  assert.equal(site.education[0].score, "91.2");
});

test("profile image paths accept only uploaded raster image locations", () => {
  const allowed = structuredClone(defaultSiteContent);
  allowed.profile.photoPath = "profile/10000000-0000-4000-8000-000000000001.webp";
  allowed.profile.showPhoto = true;
  assert.equal(siteContentSchema.safeParse(allowed).success, true);
  for (const path of ["https://example.com/photo.jpg", "profile/../../private.jpg", "profile/10000000-0000-4000-8000-000000000001.svg", "projects/10000000-0000-4000-8000-000000000001.jpg"]) {
    const invalid = structuredClone(allowed); invalid.profile.photoPath = path;
    assert.equal(siteContentSchema.safeParse(invalid).success, false);
  }
});

test("the editor refuses an empty heading and a bad link", () => {
  const blankHeading = structuredClone(defaultSiteContent); blankHeading.sections.about.title = " ";
  assert.equal(siteContentSchema.safeParse(blankHeading).success, false);
  const badLink = structuredClone(defaultSiteContent); badLink.profile.linkedin = "javascript:alert(1)";
  assert.equal(siteContentSchema.safeParse(badLink).success, false);
  const drive = structuredClone(defaultSiteContent); drive.profile.resumeUrl = "https://drive.google.com/file/d/abc/view";
  assert.equal(siteContentSchema.safeParse(drive).success, true);
  for (const url of ["//example.com/resume.pdf", "https://user:password@example.com/resume.pdf", "/\\example.com/resume.pdf"]) {
    const invalid = structuredClone(defaultSiteContent); invalid.profile.resumeUrl = url;
    assert.equal(siteContentSchema.safeParse(invalid).success, false);
  }
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
