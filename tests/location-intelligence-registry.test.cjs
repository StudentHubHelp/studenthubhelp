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

console.log('Location intelligence registry tests passed.');
