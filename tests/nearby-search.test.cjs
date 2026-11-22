'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'nearby-search.js'), 'utf8');

function loadNearby(overrides = {}) {
  const values = new Map();
  const storage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
  const window = {
    isSecureContext: true,
    sessionStorage: storage,
    navigator: { geolocation: { getCurrentPosition: overrides.getCurrentPosition || (() => {}) } }
  };
  vm.runInNewContext(source, { window, Date, Math, Number, JSON, Promise, Object, TypeError, Error });
  return { api: window.StudentHubNearbySearch, values, window };
}

test('validates coordinate ranges and supports the stored listing field names', () => {
  const { api } = loadNearby();
  assert.deepEqual(JSON.parse(JSON.stringify(api.coordinateOf({ latitude: 26.2, longitude: 75.8 }))), { lat: 26.2, lng: 75.8 });
  assert.deepEqual(JSON.parse(JSON.stringify(api.coordinateOf({ lat: 26.2, lon: 75.8 }))), { lat: 26.2, lng: 75.8 });
  assert.equal(api.coordinateOf({ latitude: 91, longitude: 75.8 }), null);
  assert.equal(api.coordinateOf({ latitude: '', longitude: 75.8 }), null);
});

test('calculates great-circle distance in kilometres', () => {
  const { api } = loadNearby();
  assert.ok(Math.abs(api.distanceKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 }) - 111.195) < 0.1);
});

test('filters strictly to 5 km, excludes bad coordinates and sorts nearest first', () => {
  const { api } = loadNearby();
  const rows = [
    { id: 'far', latitude: 0, longitude: 0.05 },
    { id: 'near', latitude: 0, longitude: 0.01 },
    { id: 'mid', latitude: 0, longitude: 0.03 },
    { id: 'missing', latitude: null, longitude: null },
    { id: 'invalid', latitude: 10, longitude: 770505 }
  ];
  const result = api.filterWithinRadius(rows, { lat: 0, lng: 0 }, 5);
  assert.deepEqual(result.map(row => row.id), ['near', 'mid']);
  assert.ok(result.every(row => row.__nearbyDistanceKm <= 5));
});

test('stores a current location for this browser session and restores it', async () => {
  const { api, values } = loadNearby({
    getCurrentPosition: success => success({ coords: { latitude: 26.2, longitude: 75.8, accuracy: 18 } })
  });
  const saved = await api.getCurrentLocation();
  assert.equal(saved.lat, 26.2);
  assert.equal(api.getStoredLocation().lng, 75.8);
  assert.ok(values.has('shhNearbyLocationV1'));
  assert.ok(values.has('shhSmartSearchCoords'));
  api.clearStoredLocation();
  assert.equal(api.getStoredLocation(), null);
});

test('returns a useful permission-denied message', async () => {
  const { api } = loadNearby({
    getCurrentPosition: (_success, failure) => failure({ code: 1 })
  });
  await assert.rejects(api.getCurrentLocation(), /permission was denied/i);
});

test('formats short and long distances for result cards', () => {
  const { api } = loadNearby();
  assert.equal(api.formatDistance(0.42), '420 m');
  assert.equal(api.formatDistance(1.24), '1.2 km');
  assert.equal(api.formatDistance(12.4), '12 km');
});

test('all five Finder pages load the shared nearby engine before Finder search', () => {
  const pages = ['pg-finder.html', 'tiffin-finder.html', 'library-finder.html', 'cafe-finder.html', 'bookstore-finder.html'];
  for (const page of pages) {
    const html = fs.readFileSync(path.join(__dirname, '..', page), 'utf8');
    assert.match(html, /js\/nearby-search\.js/);
    assert.match(html, /js\/finder-power-search\.js/);
    assert.ok(html.indexOf('js/nearby-search.js') < html.indexOf('js/finder-power-search.js'));
  }
});
