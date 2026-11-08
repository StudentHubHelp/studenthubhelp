import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const ROOT = process.cwd();
const ORIGIN = "http://127.0.0.1:4173";
const IGNORE_DIRS = new Set([".git", ".github", "node_modules", "properties", "_layouts"]);
const failures = [];
const warnings = [];
const pages = [];

async function walk(dir = ROOT) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".well-known") continue;
    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) await walk(path.join(dir, entry.name));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) {
      pages.push(path.relative(ROOT, path.join(dir, entry.name)).split(path.sep).join("/"));
    }
  }
}

function localPath(value, pagePath) {
  const raw = value.trim();
  if (!raw || raw.startsWith("#") || /^(mailto:|tel:|javascript:|data:|blob:)/i.test(raw)) return null;
  let url;
  try { url = new URL(raw, `${ORIGIN}/${pagePath}`); } catch { return null; }
  if (url.origin !== ORIGIN) return null;
  let pathname = decodeURIComponent(url.pathname);
  // Older chatbot embeds retain the repository subpath; map it to the checked-out asset tree.
  if (pathname.startsWith("/studenthubhelp/")) pathname = pathname.slice("/studenthubhelp".length);
  if (pathname.startsWith("/properties/")) return null; // handled by the site's generated-property fallback in 404.html
  if (pathname.endsWith("/")) pathname += "index.html";
  return pathname.replace(/^\//, "");
}

await walk();
pages.sort();
if (!pages.length) {
  console.error("No HTML pages found.");
  process.exit(1);
}

const imageFiles = [];
async function collectImages(dir = ROOT) {
  for (const entry of await fs.promises.readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) await collectImages(path.join(dir, entry.name));
    } else if (entry.isFile() && /\.(png|jpe?g|webp|gif|avif)$/i.test(entry.name)) {
      const full = path.join(dir, entry.name);
      const size = (await fs.promises.stat(full)).size;
      imageFiles.push({ file: path.relative(ROOT, full), size });
      if (size > 500 * 1024) warnings.push(`Large image: ${path.relative(ROOT, full)} (${(size / 1024).toFixed(0)} KB)`);
    }
  }
}
await collectImages();

for (const pagePath of pages) {
  const source = await fs.promises.readFile(path.join(ROOT, pagePath), "utf8");
  if (pagePath.startsWith("_layouts/")) continue;
  const refs = [...source.matchAll(/\b(?:href|src)\s*=\s*["']([^"'<>]+)["']/gi)].map(m => m[1]);
  for (const ref of refs) {
    // Liquid and JavaScript template expressions are generated at runtime/build time, not literal files.
    if (ref.includes("${") || ref.includes("{{") || ref.includes("}}")) continue;
    const relative = localPath(ref, pagePath);
    if (relative === null) continue;
    const target = path.resolve(ROOT, relative);
    if (!target.startsWith(ROOT + path.sep) && target !== ROOT) {
      failures.push(`Unsafe local path in ${pagePath}: ${ref}`);
      continue;
    }
    try {
      const stat = await fs.promises.stat(target);
      if (!stat.isFile()) failures.push(`Local reference is not a file: ${pagePath} -> ${ref}`);
    } catch {
      failures.push(`Missing local reference: ${pagePath} -> ${ref}`);
    }
  }
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
for (const pagePath of pages) {
  if (pagePath.startsWith("_layouts/")) continue; // Jekyll templates are not directly served HTML pages.
  const pageErrors = [];
  page.removeAllListeners("pageerror");
  page.on("pageerror", error => pageErrors.push(error.message));
  const url = `${ORIGIN}/${pagePath}`;
  try {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    if (!response || !response.ok()) failures.push(`Page failed to load: ${pagePath} (${response?.status() ?? "no response"})`);
    for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }]) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(120);
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth
      }));
      if (dimensions.content > dimensions.viewport + 1) {
        failures.push(`Horizontal overflow at ${viewport.width}px: ${pagePath} (content ${dimensions.content}px)`);
      }
    }
    if (pageErrors.length) warnings.push(`Runtime errors on ${pagePath}: ${pageErrors.slice(0, 2).join(" | ")}`);
  } catch (error) {
    failures.push(`Browser test failed: ${pagePath}: ${error.message}`);
  }
}
await browser.close();

console.log(`Checked ${pages.length} HTML pages, ${imageFiles.length} image assets, and local href/src references.`);
for (const warning of warnings) console.warn(`WARNING: ${warning}`);
if (failures.length) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  console.error(`${failures.length} verification failure(s).`);
  process.exit(1);
}
console.log("PASS: local references resolve and no horizontal overflow was detected at 390px or 768px.");
