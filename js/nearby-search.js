(function (window) {
  'use strict';

  const STORAGE_KEY = 'shhNearbyLocationV1';
  const LEGACY_STORAGE_KEY = 'shhSmartSearchCoords';
  const DEFAULT_RADIUS_KM = 5;
  const LOCATION_TTL_MS = 15 * 60 * 1000;

  function numeric(value) {
    if (value === null || value === undefined || String(value).trim() === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function normalizePoint(value) {
    if (!value || typeof value !== 'object') return null;
    const lat = numeric(value.lat ?? value.latitude);
    const lng = numeric(value.lng ?? value.longitude ?? value.lon ?? value.long);
    if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
  }

  function coordinateOf(record) {
    if (!record || typeof record !== 'object') return null;
    return normalizePoint({
      lat: record.latitude ?? record.lat ?? record.location_latitude,
      lng: record.longitude ?? record.lng ?? record.lon ?? record.long ?? record.location_longitude
    });
  }

  function readStoredLocation() {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY) || window.sessionStorage.getItem(LEGACY_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const point = normalizePoint(parsed);
      const at = numeric(parsed.at);
      if (!point || at === null || Date.now() - at > LOCATION_TTL_MS || at > Date.now() + 60000) {
        clearStoredLocation();
        return null;
      }
      return { ...point, accuracy: numeric(parsed.accuracy), at };
    } catch (error) {
      return null;
    }
  }

  function saveLocation(value) {
    const point = normalizePoint(value);
    if (!point) throw new TypeError('The device returned invalid coordinates.');
    const stored = {
      ...point,
      accuracy: numeric(value.accuracy),
      at: Date.now()
    };
    try {
      const raw = JSON.stringify(stored);
      window.sessionStorage.setItem(STORAGE_KEY, raw);
      // Keep the legacy key during the transition so older search code remains compatible.
      window.sessionStorage.setItem(LEGACY_STORAGE_KEY, raw);
    } catch (error) {
      throw new Error('Your browser could not keep the location for this search. Please allow session storage and try again.');
    }
    return stored;
  }

  function clearStoredLocation() {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
      window.sessionStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch (error) {
      // Storage may be unavailable in private browsing; nothing else is required.
    }
  }

  function getCurrentLocation(options) {
    if (window.isSecureContext === false) {
      return Promise.reject(new Error('Nearby search requires a secure HTTPS connection.'));
    }
    if (!window.navigator || !window.navigator.geolocation) {
      return Promise.reject(new Error('Location is not available in this browser. Search by city or area instead.'));
    }

    const settings = Object.assign({
      enableHighAccuracy: false,
      timeout: 12000,
      maximumAge: 60000
    }, options || {});

    return new Promise((resolve, reject) => {
      window.navigator.geolocation.getCurrentPosition(position => {
        const coords = position && position.coords;
        try {
          resolve(saveLocation({
            lat: coords && coords.latitude,
            lng: coords && coords.longitude,
            accuracy: coords && coords.accuracy
          }));
        } catch (error) {
          reject(error);
        }
      }, error => {
        const code = error && error.code;
        const message = code === 1
          ? 'Location permission was denied. Allow location access in your browser to use Nearby Search.'
          : code === 2
            ? 'Your location could not be detected. Check device location services and try again.'
            : code === 3
              ? 'Location request timed out. Please try again.'
              : 'Unable to detect your location. Search by city or area instead.';
        const failure = new Error(message);
        failure.code = code || 0;
        reject(failure);
      }, settings);
    });
  }

  function distanceKm(originValue, destinationValue) {
    const origin = normalizePoint(originValue);
    const destination = normalizePoint(destinationValue);
    if (!origin || !destination) return null;
    const radians = degrees => degrees * Math.PI / 180;
    const dLat = radians(destination.lat - origin.lat);
    const dLng = radians(destination.lng - origin.lng);
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(radians(origin.lat)) * Math.cos(radians(destination.lat))
      * Math.sin(dLng / 2) ** 2;
    return 6371.0088 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function filterWithinRadius(rows, originValue, radiusKm) {
    const origin = normalizePoint(originValue);
    const radius = numeric(radiusKm) ?? DEFAULT_RADIUS_KM;
    if (!origin || radius < 0) return [];
    return (Array.isArray(rows) ? rows : [])
      .map(record => {
        const point = coordinateOf(record);
        if (!point) return null;
        const distance = distanceKm(origin, point);
        if (distance === null || distance > radius) return null;
        return { ...record, __userDistanceKm: distance, __nearbyDistanceKm: distance };
      })
      .filter(Boolean)
      .sort((a, b) => a.__nearbyDistanceKm - b.__nearbyDistanceKm);
  }

  function formatDistance(value) {
    const km = numeric(value);
    if (km === null || km < 0) return '';
    if (km < 1) return Math.max(1, Math.round(km * 1000)) + ' m';
    return (km < 10 ? km.toFixed(1) : km.toFixed(0)) + ' km';
  }

  function directionsUrl(record) {
    const point = coordinateOf(record);
    return point
      ? 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(point.lat + ',' + point.lng)
      : '';
  }

  window.StudentHubNearbySearch = Object.freeze({
    defaultRadiusKm: DEFAULT_RADIUS_KM,
    locationTtlMs: LOCATION_TTL_MS,
    normalizePoint,
    coordinateOf,
    getStoredLocation: readStoredLocation,
    saveLocation,
    clearStoredLocation,
    getCurrentLocation,
    distanceKm,
    filterWithinRadius,
    formatDistance,
    directionsUrl
  });
})(window);
