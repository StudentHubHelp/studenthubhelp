const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const window = {};
vm.runInNewContext(fs.readFileSync('js/location-intelligence-registry.js', 'utf8'), { window });
const registry = window.StudentHubLocationRegistry;

assert.equal(registry.canonicalizeCity('New Delhi'), 'delhi');
assert.equal(registry.canonicalizeCity('Bangalore'), 'bengaluru');
assert.equal(registry.canonicalizeCity('Gurgaon'), 'gurugram');
assert.equal(registry.canonicalizeCity('सीकर (Sikar)'), 'sikar');
assert.equal(registry.canonicalizeCity('सीकर'), 'sikar');
assert.equal(registry.canonicalizeCity(''), '');
assert.deepEqual(Array.from(registry.findLandmarks('hostel near ALLEN Career Institute')), ['allen']);
assert.deepEqual(Array.from(registry.findLandmarks('library near Physics Wallah')), ['physics-wallah']);

vm.runInNewContext(fs.readFileSync('search-query-parser.js', 'utf8'), { window });
const rows = [
  { id: 'd1', city: 'Delhi', area: 'Saket', category: 'hostel' },
  { id: 'b1', city: 'Bengaluru', area: 'Basavanagudi', category: 'library' },
  { id: 'g1', city: 'Gurugram', area: 'Sector 31', category: 'tiffin' }
];
assert.equal(window.StudentHubQueryParser.parse('hostel in New Delhi', rows).city, 'delhi');
assert.equal(window.StudentHubQueryParser.parse('library near Bangalore', rows).city, 'bengaluru');
assert.equal(window.StudentHubQueryParser.parse('tiffin in Gurgaon', rows).city, 'gurugram');

const aliasRows = [
  { id: 'delhi-hostel', __category: 'hostel', name: 'Saket Student Hostel', city: 'Delhi', area: 'Saket' },
  { id: 'blr-library', __category: 'library', name: 'Basavanagudi Study Library', city: 'Bengaluru', area: 'Basavanagudi' },
  { id: 'gurgaon-tiffin', __category: 'tiffin', name: 'Sector 31 Tiffin Service', city: 'Gurugram', area: 'Sector 31' }
];
new Function('window', fs.readFileSync('search-phase6-universal.js', 'utf8'))(window);
assert.deepEqual(
  Array.from(window.StudentHubUniversalSearch.search(aliasRows, 'hostel in New Delhi', data => data).map(row => row.id)),
  ['delhi-hostel']
);
assert.deepEqual(
  Array.from(window.StudentHubUniversalSearch.search(aliasRows, 'library in Bangalore', data => data).map(row => row.id)),
  ['blr-library']
);
assert.deepEqual(
  Array.from(window.StudentHubUniversalSearch.search(aliasRows, 'tiffin in Gurgaon', data => data).map(row => row.id)),
  ['gurgaon-tiffin']
);

console.log('Location intelligence registry tests passed.');
