const endpoint = process.env.CHATBOT_TEST_URL || 'http://localhost:54321/functions/v1/studenthubhelp-chat';
const apiKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!apiKey) {
  console.error('Set SUPABASE_ANON_KEY (local Supabase anon key) before running regression tests.');
  process.exit(2);
}

const cases = [
  { query: 'Sikar mein Allen ke paas boys hostel', city: 'Sikar', category: 'hostel', forbiddenCity: 'Kota' },
  { query: 'Kota Talwandi mein budget tiffin', city: 'Kota', category: 'tiffin', forbiddenCategory: 'hostel' },
  { query: 'Jhunjhunu me cafe', city: 'Jhunjhunu', category: 'cafe' },
  { query: 'Piprali Road hostel under 5000', city: 'Sikar', category: 'hostel', maxBudget: 5000, allowNoResults: true },
  { query: 'Kota mein ₹15000 me hostel aur tiffin', city: 'Kota', combo: true, maxBudget: 15000 },
  { query: 'Mere paas hostel dikhao', expectLocationPrompt: true },
];

function numericPrice(value) {
  const match = String(value ?? '').replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

async function runCase(testCase, index) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: apiKey,
      Authorization: 'Bearer ' + apiKey,
    },
    body: JSON.stringify({
      message: testCase.query,
      sessionId: 'regression-' + Date.now() + '-' + index,
    }),
  });

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('HTTP ' + response.status + ': response was not valid JSON');
  }
  if (!response.ok) throw new Error('HTTP ' + response.status + ': ' + (data?.error || data?.reply || 'request failed'));

  const listings = data.recommendedProperties || data.recommendations || [];
  const city = String(data.targetCity || data.aiEntities?.city || '').toLowerCase();
  const category = String(data.targetCategory || data.aiEntities?.category || '').toLowerCase();
  const failures = [];
  if (testCase.expectLocationPrompt) {
    if (data.intent !== 'Location Required' || listings.length !== 0 || !String(data.reply || data.message || '').toLowerCase().includes('location')) failures.push('nearby query without GPS did not request device location/area');
    if (failures.length) throw new Error(failures.join('; '));
    return testCase.query + ' (GPS prompt returned)';
  }
  if (testCase.combo) {
    const plan = data.budgetPlan;
    const types = listings.map(item => String(item.type || '').toLowerCase());
    if (data.intent !== 'Combined Budget Plan' || !plan) failures.push('combined budget planner did not return a budgetPlan');
    if (!types.some(type => type.includes('hostel')) || !types.some(type => type.includes('tiffin'))) failures.push('combo must contain both a hostel and a tiffin listing');
    if (Number(plan?.totalEstimated) > testCase.maxBudget) failures.push('combined monthly total exceeds budget');
    if (Number(plan?.totalEstimated) <= 0) failures.push('combined monthly total is missing/invalid');
    if (listings.some(item => String(item.city || '').toLowerCase() !== testCase.city.toLowerCase())) failures.push('combo contains a listing from another city');
    if (failures.length) throw new Error(failures.join('; '));
    return testCase.query + ' (combo total ₹' + Number(plan.totalEstimated).toLocaleString('en-IN') + ')';
  }

  if (!city.includes(testCase.city.toLowerCase())) failures.push('expected target city ' + testCase.city + ', received ' + (city || 'none'));
  if (testCase.category && !category.includes(testCase.category)) failures.push('expected category ' + testCase.category + ', received ' + (category || 'none'));
  if (!Array.isArray(listings) || (listings.length === 0 && !testCase.allowNoResults)) failures.push('no live listing returned');
  for (const listing of listings) {
    const listingCity = String(listing.city || '').toLowerCase();
    const listingCategory = String(listing.type || listing.category || '').toLowerCase();
    if (!listingCategory) failures.push('listing category missing: ' + (listing.name || listing.id));
    if (!listingCity) failures.push('listing city missing: ' + (listing.name || listing.id));
    if (listingCity && listingCity !== testCase.city.toLowerCase()) failures.push('cross-city listing leaked: ' + listing.city);
    if (testCase.forbiddenCity && listingCity.includes(testCase.forbiddenCity.toLowerCase())) failures.push('forbidden city leaked: ' + listing.city);
    if (testCase.forbiddenCategory && listingCategory.includes(testCase.forbiddenCategory)) failures.push('forbidden category leaked: ' + listingCategory);
    if (testCase.category && listingCategory && !listingCategory.includes(testCase.category)) failures.push('wrong category listing: ' + listingCategory);
    if (testCase.maxBudget) {
      const price = numericPrice(listing.price);
      if (price !== null && price > testCase.maxBudget) failures.push('budget exceeded: ' + listing.price);
      if (price === null) failures.push('listing price missing; cannot verify max budget: ' + (listing.name || listing.id));
    }
  }

  if (failures.length) throw new Error(failures.join('; '));
  return testCase.query + ' (' + listings.length + ' listings)';
}

console.log('StudentHubHelp chatbot regression suite: ' + endpoint);
let failed = 0;
for (const [index, testCase] of cases.entries()) {
  try {
    const detail = await runCase(testCase, index);
    console.log('PASS: ' + detail);
  } catch (error) {
    failed += 1;
    console.error('FAIL: ' + testCase.query + '\n  ' + (error instanceof Error ? error.message : String(error)));
  }
}
console.log('\nResult: ' + (cases.length - failed) + '/' + cases.length + ' passed');
if (failed) process.exit(1);
