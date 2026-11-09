import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('./chatbot.js', import.meta.url), 'utf8');
const instrumented = source.replace(/\}\)\(\);\s*$/, [
  'globalThis.__SHH_CHATBOT_TEST__ = { norm, categoryOf, genderOf, budgetOf, requestedFacilities, matchSearch };',
  '})();',
].join('\n'));
assert.notEqual(instrumented, source, 'test hook should attach before the chatbot IIFE closes');

const storage = new Map();
const sandbox = {
  window: {},
  document: { readyState: 'loading', addEventListener() {}, createElement() { return {}; }, head: { appendChild() {} } },
  localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key) },
  location: { pathname: '/chatbot-test' },
  console,
  Date,
  Math,
  Promise,
};
vm.runInNewContext(instrumented, sandbox, { filename: 'chatbot.js' });
const api = sandbox.__SHH_CHATBOT_TEST__;

const rows = [
  { id: 1, __category: 'cafe', city: 'Sikar', area: 'Piprali Road', name: 'Sikar Piprali Cafe', status: 'active' },
  { id: 2, __category: 'cafe', city: 'Jaipur', area: 'Piprali Road', name: 'Jaipur Piprali Cafe', status: 'active' },
  { id: 3, __category: 'hostel', city: 'Sikar', area: 'Piprali Road', name: 'Alpha Boys Hostel', type: 'Boys', monthly_rent: 5000, facilities: 'WiFi, AC', status: 'active' },
  { id: 4, __category: 'hostel', city: 'Sikar', area: 'Piprali Road', name: 'Beta Girls Hostel', type: 'Girls', monthly_rent: 5500, status: 'active' },
  { id: 5, __category: 'library', city: 'Jaipur', area: 'Malviya Nagar', name: 'Study Library', girls_section: true, status: 'active' },
  { id: 6, __category: 'tiffin', city: 'Kota', area: 'Talwandi', name: 'Daily Tiffin', monthly_plan: 2500, delivery_available: true, status: 'active' },
  { id: 7, __category: 'bookstore', city: 'Kota', area: 'Talwandi', name: 'Campus Bookstore', stationery: true, status: 'active' },
];

test('recognizes common misspellings across all five categories', () => {
  assert.equal(api.categoryOf('hostle chahiye'), 'hostel');
  assert.equal(api.categoryOf('tifin service'), 'tiffin');
  assert.equal(api.categoryOf('libary near me'), 'library');
  assert.equal(api.categoryOf('cafee dikhao'), 'cafe');
  assert.equal(api.categoryOf('bookstroe'), 'bookstore');
});

test('parses gender, budget and facility follow-ups', () => {
  assert.equal(api.genderOf('boys hostel'), 'boys');
  assert.equal(api.genderOf('girls PG'), 'girls');
  assert.equal(api.budgetOf('6000 tak'), 6000);
  assert.deepEqual(Array.from(api.requestedFacilities('wifi aur AC')), ['wifi', 'ac']);
});

test('keeps city-specific results when city is explicit', () => {
  const result = api.matchSearch(rows, 'Sikar mein cafe dikhao', 'cafe', null);
  assert.deepEqual(Array.from(result.rows, row => row.id), [1]);
  assert.equal(result.cityName, 'Sikar');
});

test('carries city and area context into a category follow-up', () => {
  const previous = { cityName: 'Sikar', areaName: 'Piprali Road', gender: null, budget: null, facilities: [] };
  const result = api.matchSearch(rows, 'cafe dikhao', 'cafe', previous);
  assert.deepEqual(Array.from(result.rows, row => row.id), [1]);
  assert.equal(result.cityName, 'Sikar');
  assert.equal(result.areaName, 'Piprali Road');
});

test('does not mix cities when an area name exists in multiple cities', () => {
  const result = api.matchSearch(rows, 'Piprali Road par cafe dikhao', 'cafe', null);
  assert.equal(result.rows.length, 0);
  assert.equal(result.cityName, null);
});

test('applies a follow-up boys and budget filter to the previous hostel search', () => {
  const previous = { cityName: 'Sikar', areaName: 'Piprali Road', gender: null, budget: null, facilities: [] };
  const result = api.matchSearch(rows, 'boys hostel 6000 tak', 'hostel', previous);
  assert.deepEqual(Array.from(result.rows, row => row.id), [3]);
  assert.equal(result.gender, 'boys');
  assert.equal(result.budget, 6000);
});

test('corrects a common city spelling error without widening to other cities', () => {
  const result = api.matchSearch(rows, 'Jaipurr mein cafe dikhao', 'cafe', null);
  assert.deepEqual(Array.from(result.rows, row => row.id), [2]);
  assert.equal(result.cityName, 'Jaipur');
});
