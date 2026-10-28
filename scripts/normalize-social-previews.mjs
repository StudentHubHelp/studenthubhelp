import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const BASE_URL = (process.env.BASE_URL || 'https://studenthubhelp.in').replace(/\/+$/, '');
const SHARE_IMAGE = `${BASE_URL}/share-preview.png?v=20261028`;
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

function setMeta(html, matcher, attribute, value) {
  let found = false;
  html = html.replace(/<meta\b[^>]*>/gi, tag => {
    if (!matcher.test(tag)) return tag;
    found = true;
    const attrPattern = new RegExp('\\b' + attribute + '\\s*=\\s*(["\\\\']).*?\\1', 'i');
    if (attrPattern.test(tag)) return tag.replace(attrPattern, `${attribute}="${value}"`);
    return tag.replace(/>$/, ` ${attribute}="${value}">`);
  });
  return { html, found };
}

function addMetaIfMissing(html, key, attrs) {
  const matcher = new RegExp('\\b' + key.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&') + '\\s*=', 'i');
  if (matcher.test(html)) return html;
  const tag = `<meta ${attrs}>\n`;
  if (/<head\b[^>]*>/i.test(html)) return html.replace(/<head\b[^>]*>/i, match => match + '\\n' + tag);
  return html;
}

function normalize(html, filePath) {
  const title = (html.match(/<title[^>]*>([\\s\\S]*?)<\\/title>/i) || [,'StudentHubHelp | Student Services Across India'])[1].replace(/<[^>]+>/g, '').trim();
  const description = (html.match(/<meta\\b(?=[^>]*\\bname=["']description["'])[^>]*\\bcontent=["']([^"']*)["'][^>]*>/i) || [,'Discover hostels, PGs, tiffin services, libraries, cafes and bookstores with StudentHubHelp.'])[1];

  const ogImage = /\\bproperty=["']og:image["']/i;
  const twImage = /\\bname=["']twitter:image["']/i;
  const ogSecure = /\\bproperty=["']og:image:secure_url["']/i;
  const ogAlt = /\\bproperty=["']og:image:alt["']/i;
  const ogWidth = /\\bproperty=["']og:image:width["']/i;
  const ogHeight = /\\bproperty=["']og:image:height["']/i;
  const twCard = /\\bname=["']twitter:card["']/i;
  const ogTitle = /\\bproperty=["']og:title["']/i;
  const ogDesc = /\\bproperty=["']og:description["']/i;
  const ogType = /\\bproperty=["']og:type["']/i;

  let result;
  for (const [matcher, attr, value] of [
    [ogImage, 'content', SHARE_IMAGE],
    [twImage, 'content', SHARE_IMAGE],
    [ogSecure, 'content', SHARE_IMAGE],
    [ogAlt, 'content', 'StudentHubHelp logo and student services'],
    [ogWidth, 'content', '1200'],
    [ogHeight, 'content', '630'],
    [twCard, 'content', 'summary_large_image'],
  ]) {
    result = setMeta(html, matcher, attr, value);
    html = result.html;
    if (!result.found) {
      const key = matcher === ogImage ? 'property="og:image"' :
        matcher === twImage ? 'name="twitter:image"' :
        matcher === ogSecure ? 'property="og:image:secure_url"' :
        matcher === ogAlt ? 'property="og:image:alt"' :
        matcher === ogWidth ? 'property="og:image:width"' :
        matcher === ogHeight ? 'property="og:image:height"' : 'name="twitter:card"';
      html = addMetaIfMissing(html, key, `${key} content="${value}"`);
    }
  }

  for (const [matcher, key, value] of [
    [ogTitle, 'property="og:title"', title],
    [ogDesc, 'property="og:description"', description],
    [ogType, 'property="og:type"', 'website'],
  ]) {
    result = setMeta(html, matcher, 'content', value);
    html = result.html;
    if (!result.found) html = addMetaIfMissing(html, key, `${key} content="${String(value).replace(/"/g, '&quot;')}"`);
  }

  return html;
}

const files = await walk(ROOT);
let changed = 0;
for (const file of files) {
  const original = await readFile(file, 'utf8');
  const updated = normalize(original, file);
  if (updated !== original) {
    await writeFile(file, updated, 'utf8');
    changed++;
  }
}
console.log(`Normalized social preview metadata in ${changed} HTML files; image: ${SHARE_IMAGE}`);
