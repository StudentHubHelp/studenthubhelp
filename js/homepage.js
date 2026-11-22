(() => {
  'use strict';

  const SUPABASE_URL = 'https://idurlccrarznnnqixxsd.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkdXJsY2NyYXJ6bm5ubmlx eHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5ODY3NTgsImV4cCI6MjEwMzU2Mjc1OH0.pq_rza98twL-SETqm_6TGNzsPCkVJxwjocFUeLB1yMA'.replace(/\\s/g, '');
  const SOURCES = [
    { table: 'hostels', key: 'hostel', label: 'Hostel / PG', countId: 'hostelCount', icon: '⌂' },
    { table: 'tiffins', key: 'tiffin', label: 'Tiffin / Mess', countId: 'tiffinCount', icon: '◒' },
    { table: 'libraries', key: 'library', label: 'Library', countId: 'libraryCount', icon: '▤' },
    { table: 'cafes', key: 'cafe', label: 'Cafe', countId: 'cafeCount', icon: '☕' },
    { table: 'bookstores', key: 'bookstore', label: 'Bookstore', countId: 'bookstoreCount', icon: '▣' }
  ];
  const ACTIVE = ['active', 'published', 'approved', 'live'];
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const first = (row, keys) => {
    for (const key of keys) {
      const value = row?.[key];
      if (value !== null && value !== undefined && String(value).trim() !== '') return value;
    }
    return '';
  };
  const isPublic = (row) => ACTIVE.includes(String(row?.status || '').trim().toLowerCase()) ||
    row?.is_active === true || row?.active === true;
  const slugify = (value) => String(value || '').normalize('NFKD').toLowerCase().trim()
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const detailUrl = (row, category) => {
    const slug = String(row?.slug || '').trim() || slugify([
      first(row, ['name', 'property_name', 'service_name', 'title', 'business_name']),
      first(row, ['area', 'locality', 'location']),
      first(row, ['city', 'district'])
    ].filter(Boolean).join(' '));
    return slug ? '/properties/' + encodeURIComponent(category) + '/' + encodeURIComponent(slug) + '/' : '/explore-listings.html';
  };
  const imageUrl = (row) => {
    const value = first(row, ['image', 'image_url', 'photo', 'photo_url', 'cover_image', 'banner_url',
      'property_image', 'property_image_url', 'listing_image', 'listing_image_url', 'thumbnail_url',
      'image_path', 'photo_path', 'images', 'photos', 'gallery', 'image_urls']);
    if (Array.isArray(value)) {
      const item = value.find((entry) => typeof entry === 'string' ? entry.trim() : entry && (entry.url || entry.src || entry.path));
      return typeof item === 'string' ? item.trim() : item?.url || item?.src || item?.path || '';
    }
    if (value && typeof value === 'object') return value.url || value.src || value.path || '';
    return typeof value === 'string' ? value.trim() : '';
  };
  const priceText = (row, category) => {
    const keys = category === 'hostel'
      ? ['monthly_rent', 'monthly_rent_range', 'rent', 'price']
      : category === 'tiffin'
        ? ['monthly_plan', 'monthly_charge', 'monthly_fee', 'price']
        : ['monthly_fee', 'price', 'daily_fee'];
    const raw = first(row, keys);
    if (!raw) return '';
    const clean = String(raw).trim();
    return /₹|rs\.?/i.test(clean) ? clean : '₹' + clean;
  };
  const facilityLabels = (row) => {
    const candidates = [
      ['wifi', 'Wi-Fi'], ['ac', 'AC'], ['ac_available', 'AC'], ['cctv', 'CCTV'],
      ['laundry', 'Laundry'], ['power_backup', 'Power backup'], ['parking', 'Parking'],
      ['open_24_hours', '24 hours'], ['delivery_available', 'Delivery'], ['stationery', 'Stationery']
    ];
    return candidates.filter(([key]) => row?.[key] === true).map(([, label]) => label).slice(0, 3);
  };

  async function init() {
    $('footerYear') && ($('footerYear').textContent = String(new Date().getFullYear()));
    if (!window.supabase?.createClient) {
      showStatsUnavailable();
      showListingsUnavailable('The listing service is temporarily unavailable.');
      return;
    }
    const db = window.__SHH_HOME_DB__ || (window.__SHH_HOME_DB__ = window.supabase.createClient(
      SUPABASE_URL, SUPABASE_ANON_KEY,
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
    ));
    const [counts, capacity, listingGroups] = await Promise.all([
      loadCounts(db), loadCapacity(db), loadFeatured(db)
    ]);
    renderCounts(counts);
    renderCapacity(capacity);
    renderFeatured(listingGroups);
  }

  function showStatsUnavailable() {
    SOURCES.forEach((source) => { if ($(source.countId)) $(source.countId).textContent = '—'; });
    if ($('hostelCapacity')) $('hostelCapacity').textContent = 'Live counts unavailable';
  }
  function showListingsUnavailable(message) {
    const grid = $('featuredListings');
    if (grid) grid.innerHTML = '<div class="listing-empty-state">' + esc(message) + ' <a href="/explore-listings.html">Browse all listings</a>.</div>';
    if ($('featuredStatus')) $('featuredStatus').textContent = '';
  }

  async function loadCounts(db) {
    const pairs = await Promise.all(SOURCES.map(async (source) => {
      try {
        const { count, error } = await db.from(source.table).select('*', { count: 'exact', head: true }).in('status', ACTIVE);
        if (error) throw error;
        return [source.key, Number.isFinite(count) ? count : null];
      } catch (error) {
        console.warn('[StudentHubHelp] Count unavailable for ' + source.table, error.message);
        return [source.key, null];
      }
    }));
    return Object.fromEntries(pairs);
  }
  function renderCounts(counts) {
    SOURCES.forEach((source) => {
      const node = $(source.countId);
      const value = counts[source.key];
      if (node) node.textContent = value === null ? '—' : value.toLocaleString('en-IN');
    });
  }

  async function loadCapacity(db) {
    try {
      const { data, error } = await db.from('hostels').select('total_beds,type,category,status').in('status', ACTIVE).limit(3000);
      if (error) throw error;
      let total = 0, girls = 0, boys = 0;
      (data || []).filter(isPublic).forEach((row) => {
        const beds = Number(row.total_beds);
        if (!Number.isFinite(beds) || beds <= 0) return;
        total += beds;
        const gender = (String(row.type || '') + ' ' + String(row.category || '')).toLowerCase();
        const isGirls = /\b(girl|girls|women|female)\b/.test(gender);
        const isBoys = /\b(boy|boys|men|male)\b/.test(gender);
        const mixed = /co[ -]?ed|mixed|boys\s*\/\s*girls|girls\s*\/\s*boys/.test(gender);
        if (isGirls && !mixed) girls += beds;
        if (isBoys && !mixed) boys += beds;
      });
      const roundDown = (n) => Math.floor(n / 50) * 50;
      return { total: roundDown(total), girls: roundDown(girls), boys: roundDown(boys) };
    } catch (error) {
      console.warn('[StudentHubHelp] Hostel capacity unavailable', error.message);
      return null;
    }
  }
  function renderCapacity(data) {
    const node = $('hostelCapacity');
    if (!node) return;
    if (!data || !data.total) { node.textContent = 'Seat information where provided'; return; }
    const parts = [];
    if (data.girls) parts.push('Girls ' + data.girls.toLocaleString('en-IN') + '+');
    if (data.boys) parts.push('Boys ' + data.boys.toLocaleString('en-IN') + '+');
    node.textContent = data.total.toLocaleString('en-IN') + '+ known seats' + (parts.length ? ' · ' + parts.join(' · ') : '');
  }

  async function loadFeatured(db) {
    const groups = await Promise.all(SOURCES.map(async (source) => {
      try {
        const { data, error } = await db.from(source.table).select('*').in('status', ACTIVE)
          .order('created_at', { ascending: false }).limit(30);
        if (error) throw error;
        return (data || []).filter(isPublic).map((row) => ({ row, source }));
      } catch (error) {
        console.warn('[StudentHubHelp] Featured listings unavailable for ' + source.table, error.message);
        return [];
      }
    }));
    return groups.flat().sort((a, b) => {
      const ad = Date.parse(a.row.created_at || '') || 0;
      const bd = Date.parse(b.row.created_at || '') || 0;
      return bd - ad;
    }).slice(0, 6);
  }

  function renderFeatured(items) {
    const grid = $('featuredListings');
    const status = $('featuredStatus');
    if (!grid) return;
    if (!items.length) {
      grid.innerHTML = '<div class="listing-empty-state">No public listings are available to feature right now. <a href="/explore-listings.html">Browse the directory</a>.</div>';
      if (status) status.textContent = 'Listings appear here when publicly active records are available.';
      return;
    }
    grid.innerHTML = items.map(({ row, source }) => {
      const name = first(row, ['name', 'property_name', 'service_name', 'title', 'business_name']) || source.label;
      const address = [first(row, ['address', 'full_address', 'location_address']), first(row, ['area', 'locality', 'neighborhood']), first(row, ['city', 'district', 'town'])]
        .filter((value, index, values) => value && values.findIndex((other) => String(other).toLowerCase() === String(value).toLowerCase()) === index)
        .map(esc).join(', ');
      const photo = imageUrl(row);
      const verified = row.verified === true || row.is_verified === true;
      const price = priceText(row, source.key);
      const facilities = facilityLabels(row);
      const href = detailUrl(row, source.key);
      const photoMarkup = photo
        ? '<img src="' + esc(photo) + '" alt="' + esc(name) + '" loading="lazy" decoding="async">'
        : '<div class="listing-photo-placeholder"><div><strong>' + esc(source.label) + '</strong><small>Property photo not provided</small></div></div>';
      return '<article class="listing-card"><a href="' + esc(href) + '" aria-label="View details for ' + esc(name) + '"><div class="listing-photo">' + photoMarkup + '<span class="listing-category-label">' + esc(source.label) + '</span></div></a><div class="listing-body"><div class="listing-topline"><span class="' + (verified ? 'listing-verified' : 'listing-unverified') + '">' + (verified ? '✓ VERIFIED LISTING' : 'DETAILS PROVIDED') + '</span></div><h3>' + esc(name) + '</h3><div class="listing-address">' + (address || 'Location details on listing page') + '</div><div class="listing-facts">' + facilities.map((label) => '<span>' + esc(label) + '</span>').join('') + '</div></div><div class="listing-foot"><span class="listing-price">' + esc(price || 'View pricing') + '</span><a class="listing-details" href="' + esc(href) + '">View details ↗</a></div></article>';
    }).join('');
    if (status) status.textContent = 'Showing up to six recent publicly active listings. Availability and details should be confirmed directly.';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();