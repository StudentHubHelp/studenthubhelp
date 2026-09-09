/* StudentHubHelp - Dynamic SEO / Google discovery layer
 * UI-safe: metadata/structured-data only; does not replace finder rendering or search.
 */
(function () {
  'use strict';
  var BASE = 'https://studenthubhelp.github.io/studenthubhelp/';

  function clean(v) {
    return String(v || '').replace(/\s+/g, ' ').trim();
  }

  function upsertJsonLd(id, data) {
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement('script');
      el.type = 'application/ld+json';
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(data);
  }

  function updatePropertySEO() {
    var params = new URLSearchParams(location.search);
    var id = params.get('id') || params.get('propertyId') || params.get('listing_id') || params.get('listingId') || params.get('slug');
    if (!id) return;

    var titleNode = document.querySelector('[data-property-title], .title, h1');
    var locationNode = document.querySelector('[data-property-location], .location');
    var descNode = document.querySelector('[data-property-description], .desc');
    var name = clean(titleNode && titleNode.textContent) || 'Student Property';
    var location = clean(locationNode && locationNode.textContent);
    var desc = clean(descNode && descNode.textContent) || 'Student-friendly property listing on StudentHubHelp.';
    var pageUrl = location.href.split('#')[0];
    var finalTitle = name + (location ? ' | ' + location : '') + ' | StudentHubHelp';

    document.title = finalTitle;
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', desc.slice(0, 300));
    var canonical = document.getElementById('canonicalLink');
    if (canonical) canonical.setAttribute('href', pageUrl);
    var ogTitle = document.getElementById('ogTitle');
    if (ogTitle) ogTitle.setAttribute('content', finalTitle);
    var ogDesc = document.getElementById('ogDescription');
    if (ogDesc) ogDesc.setAttribute('content', desc.slice(0, 300));
    var ogUrl = document.getElementById('ogUrl');
    if (ogUrl) ogUrl.setAttribute('content', pageUrl);
    var twTitle = document.getElementById('twitterTitle');
    if (twTitle) twTitle.setAttribute('content', finalTitle);
    var twDesc = document.getElementById('twitterDescription');
    if (twDesc) twDesc.setAttribute('content', desc.slice(0, 300));

    upsertJsonLd('dynamicPropertySEO', {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': finalTitle,
      'description': desc.slice(0, 500),
      'url': pageUrl,
      'isPartOf': { '@type': 'WebSite', 'name': 'StudentHubHelp', 'url': BASE }
    });
  }

  function buildFinderItemList() {
    var path = location.pathname;
    if (!/(pg-finder|tiffin-finder|library-finder|cafe-finder|bookstore-finder)\.html$/i.test(path)) return;
    var anchors = Array.prototype.slice.call(document.querySelectorAll('a[href]'));
    var items = [];
    anchors.forEach(function (a) {
      var href = a.href || '';
      if (!/property-details\.html/i.test(href)) return;
      var text = clean(a.textContent) || clean(a.getAttribute('aria-label'));
      if (!text) return;
      if (items.some(function (x) { return x.url === href; })) return;
      items.push({ '@type': 'ListItem', 'position': items.length + 1, 'name': text.slice(0, 180), 'url': href });
    });
    if (items.length) {
      upsertJsonLd('finderItemListSEO', {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        'name': clean(document.title),
        'itemListElement': items.slice(0, 100)
      });
    }
  }

  function run() {
    updatePropertySEO();
    buildFinderItemList();
    var observer = new MutationObserver(function () {
      updatePropertySEO();
      buildFinderItemList();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
