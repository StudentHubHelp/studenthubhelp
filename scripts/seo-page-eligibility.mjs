import { readFile } from 'node:fs/promises';

export const RULES = JSON.parse(await readFile(new URL('../data/seo-page-rules.json', import.meta.url), 'utf8'));
export const CATEGORIES = Object.freeze([...RULES.categories]);
const asDate = value => { if (!value) return null; const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date; };
const dayMs = 86400000;

export function pageMeetsThreshold({ type, listingCount = 0, verifiedCount = 0, categoryCount = 0, profileComplete = false, cityCount = 0 }) {
  const rule = RULES.rules[type];
  if (!rule) throw new Error('Unknown SEO page type: ' + type);
  if (type === 'studentCitiesHub') return cityCount >= rule.minCities;
  if (listingCount < (rule.minListings || 0)) return false;
  if (verifiedCount < (rule.minVerified || 0)) return false;
  if (categoryCount < (rule.minCategories || 0)) return false;
  if (rule.needsAreaProfile && profileComplete !== true) return false;
  return true;
}

/**
 * Never-indexed thin pages are omitted. Previously indexed pages enter a 30-day
 * noindex grace period, recover if data returns, then become redirect candidates.
 */
export function decidePageState(input) {
  const now = asDate(input.now) || new Date();
  const previous = input.previousState || {};
  const thresholdMet = pageMeetsThreshold(input);
  const rule = RULES.rules[input.type];
  const demoteAt = Math.max(0, (rule?.minListings || 0) - RULES.demotion.buffer);
  const verifiedCount = input.verifiedCount ?? 0;
  const categoryCount = input.categoryCount ?? 0;
  if (thresholdMet) return { status:'index', robots:'index,follow', sitemap:true, linkable:true, belowThresholdSince:null, reason:previous.status === 'noindex-grace' ? 'recovered-or-promoted' : 'threshold-met' };
  const wasIndexed = previous.status === 'index' || previous.status === 'noindex-grace' || previous.everIndexed === true;
  if (!wasIndexed) return { status:'omit', robots:null, sitemap:false, linkable:false, belowThresholdSince:null, reason:'new-page-below-threshold' };
  const belowSince = asDate(previous.belowThresholdSince) || asDate(previous.noindexSince) || now;
  const elapsedDays = Math.floor((now.getTime() - belowSince.getTime()) / dayMs);
  if (elapsedDays >= RULES.demotion.graceDays) return { status:'redirect', robots:'noindex,follow', sitemap:false, linkable:false, belowThresholdSince:belowSince.toISOString(), reason:'grace-period-expired' };
  const hardGatesMet = verifiedCount >= (rule?.minVerified || 0) && categoryCount >= (rule?.minCategories || 0) && (!rule?.needsAreaProfile || input.profileComplete === true);
  if (input.listingCount > demoteAt && hardGatesMet && previous.status === 'index') return { status:'index', robots:'index,follow', sitemap:true, linkable:true, belowThresholdSince:null, reason:'hysteresis-buffer' };
  return { status:'noindex-grace', robots:'noindex,follow', sitemap:false, linkable:false, belowThresholdSince:belowSince.toISOString(), reason:'demotion-grace' };
}

export function pageStateKey({ type, citySlug, categorySlug = '', areaSlug = '' }) { return [type, citySlug, categorySlug, areaSlug].join('|'); }
export function parentPath({ type, citySlug, categorySlug = '' }) {
  if (type === 'areaCategory') return '/' + citySlug + '/' + categorySlug + '/';
  if (type === 'areaHub') return '/' + citySlug + '/';
  if (type === 'cityCategory') return '/' + citySlug + '/';
  return '/student-cities.html';
}
