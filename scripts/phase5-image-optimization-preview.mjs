import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const outputRoot = path.join(root, "artifacts", "optimized-images");
const report = [];
const skipDirs = new Set([".git", ".github", "node_modules", "properties", "artifacts"]);

async function walk(dir = root) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) await walk(full);
      continue;
    }
    if (!entry.isFile() || !/\.png$/i.test(entry.name)) continue;
    const relative = path.relative(root, full);
    const before = (await fs.stat(full)).size;
    if (before < 500 * 1024) continue;
    const target = path.join(outputRoot, relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    try {
      await sharp(full)
        .withMetadata()
        .png({ compressionLevel: 9, adaptiveFiltering: true, palette: false, effort: 10 })
        .toFile(target);
      const after = (await fs.stat(target)).size;
      if (after >= before) {
        await fs.rm(target, { force: true });
        report.push({ file: relative, before, after: before, result: "No lossless size reduction; original retained" });
      } else {
        report.push({ file: relative, before, after, result: "Lossless optimized preview created" });
      }
    } catch (error) {
      report.push({ file: relative, before, after: null, result: `Skipped: ${error.message}` });
    }
  }
}
await walk();

const lines = [
  "# StudentHubHelp image optimization preview",
  "",
  "Only PNG assets larger than 500 KB were considered. Compression is lossless; source files were not changed.",
  "",
  "| Asset | Original | Preview | Result |",
  "|---|---:|---:|---|",
  ...report.map(x => `| ${x.file} | ${(x.before / 1024).toFixed(0)} KB | ${x.after === null ? "—" : (x.after / 1024).toFixed(0) + " KB"} | ${x.result} |`),
  "",
  "Review the preview images before replacing production assets. Favicon and social-preview branding should be visually checked before deployment."
];
await fs.mkdir(path.dirname(path.join(outputRoot, "REPORT.md")), { recursive: true });
await fs.writeFile(path.join(outputRoot, "REPORT.md"), lines.join("\n"));
console.log(lines.join("\n"));
