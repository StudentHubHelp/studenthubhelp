import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const BASE_URL = (process.env.BASE_URL || 'https://studenthubhelp.in').replace(/\/+$/, '');
const SHARE_IMAGE = `${BASE_URL}/logo.png`;
const SKIP_DIRS = new Set(['.git', 'node_modules', '.github', '.next', 'dist', 'build']);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) files.push(...await walk(path.join(dir, entry.name)));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

function ensureMeta(html, matcher, key, value) {
  let found = false;
  html = html.replace(/<meta\b[^>]*>/gi, tag => {
    if (!matcher.test(tag)) return tag;
    found = true;
    const contentPattern = /\bcontent\s*=\s*(["'])[\s\S]*?\1/i;
    if (contentPattern.test(tag)) return tag.replace(contentPattern, `content="${String(value).replace(/"/g, '&quot;')}"`);
    return tag.replace(/>$/, ` content="${String(value).replace(/"/g, '&quot;')}">`);
  });
  if (found) return html;
  const tag = `<meta ${key} content="${String(value).replace(/"/g, '&quot;')}">\n`;
  return /<head\b[^>]*>/i.test(html)
    ? html.replace(/<head\b[^>]*>/i, match => match + '\n' + tag)
    : html;
}

function dedupeSocialMeta(html) {
  const seen = new Set();
  return html.replace(/<meta\b[^>]*>/gi, tag => {
    const match = tag.match(/\b(?:property|name)=["'](og:image(?::(?:secure_url|alt|width|height))?|twitter:image|twitter:card|og:title|og:description|og:type)["']/i);
    if (!match) return tag;
    const key = match[1].toLowerCase();
    if (key === 'og:image:width' || key === 'og:image:height') return '';
    if (seen.has(key)) return '';
    seen.add(key);
    return tag;
  }).replace(/\n[ \t]*\n{2,}/g, '\n\n');
}

function normalize(html) {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [,'StudentHubHelp | Student Services Across India'])[1].replace(/<[^>]+>/g, '').trim();
  const description = (html.match(/<meta\b(?=[^>]*\bname=["']description["'])[^>]*\bcontent=["']([^"']*)["'][^>]*>/i) || [,'Discover hostels, PGs, tiffin services, libraries, cafes and bookstores with StudentHubHelp.'])[1];

  const metas = [
    [/\bproperty=["']og:image["']/i, 'property="og:image"', SHARE_IMAGE],
    [/\bname=["']twitter:image["']/i, 'name="twitter:image"', SHARE_IMAGE],
    [/\bproperty=["']og:image:secure_url["']/i, 'property="og:image:secure_url"', SHARE_IMAGE],
    [/\bproperty=["']og:image:alt["']/i, 'property="og:image:alt"', 'StudentHubHelp logo and student services'],
    [/\bname=["']twitter:card["']/i, 'name="twitter:card"', 'summary_large_image'],
    [/\bproperty=["']og:title["']/i, 'property="og:title"', title],
    [/\bproperty=["']og:description["']/i, 'property="og:description"', description],
    [/\bproperty=["']og:type["']/i, 'property="og:type"', 'website'],
  ];
  for (const [matcher, key, value] of metas) html = ensureMeta(html, matcher, key, value);
  return dedupeSocialMeta(html);
}

const files = await walk(ROOT);
let changed = 0;
for (const file of files) {
  const original = await readFile(file, 'utf8');
  const updated = normalize(original);
  if (updated !== original) {
    await writeFile(file, updated, 'utf8');
    changed++;
  }
}
console.log(`Normalized social preview metadata in ${changed} HTML files; image: ${SHARE_IMAGE}`);
