// SpecLedger - Site JavaScript
// Phone comparison functionality with SEO hardening

(function() {
  'use strict';

  // ===== Phone Comparison Module =====
  
  // Fetch phones data from JSON
  async function fetchPhonesData() {
    try {
      const response = await fetch('../data/phones.json');
      if (!response.ok) {
        throw new Error('Failed to fetch phones data');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching phones data:', error);
      return [];
    }
  }

  // Parse URL query parameters
  function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const ids = params.get('ids');
    return ids ? ids.split(',').map(id => id.trim()) : [];
  }

  // Check if page has query parameters (for dynamic comparison pages)
  function hasQueryParams() {
    return window.location.search.length > 0;
  }

  // Get comparison IDs from data-ids attribute or query params
  function getComparisonIds() {
    // First check for data-ids attribute on comparison page section
    const comparisonSection = document.querySelector('[data-ids]');
    if (comparisonSection) {
      const dataIds = comparisonSection.getAttribute('data-ids');
      return dataIds ? dataIds.split(',').map(id => id.trim()) : [];
    }
    
    // Fall back to query parameters
    return getQueryParams();
  }

  // Check if we're on a programmatic comparison page (data-ids attribute)
  function isProgrammaticPage() {
    return document.querySelector('[data-ids]') !== null;
  }

  // Add robots meta tag for SEO control
  function setRobotsMeta() {
    // Dynamic pages with query params should not be indexed
    if (hasQueryParams() && !isProgrammaticPage()) {
      let robotsMeta = document.querySelector('meta[name="robots"]');
      if (!robotsMeta) {
        robotsMeta = document.createElement('meta');
        robotsMeta.setAttribute('name', 'robots');
        document.head.appendChild(robotsMeta);
      }
      // noindex, follow: don't index but follow links
      robotsMeta.setAttribute('content', 'noindex, follow');
    }
  }

  // Add canonical URL for SEO
  function setCanonicalUrl() {
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }

    // For programmatic pages, canonical is the page itself without params
    // For dynamic pages with query params, canonical is the page without params
    const currentPath = window.location.pathname;
    const canonicalUrl = window.location.origin + currentPath;
    canonicalLink.setAttribute('href', canonicalUrl);
  }

  // Add structured data (JSON-LD) for products in comparison
  function addStructuredData(selectedPhones) {
    if (selectedPhones.length === 0) return;

    try {
      // Build Product schema for each phone
      const products = selectedPhones.map(phone => ({
        "@type": "Product",
        "name": `${phone.brand} ${phone.model}`,
        "brand": {
          "@type": "Brand",
          "name": phone.brand
        },
        "model": phone.model,
        "releaseDate": `${phone.release_year}`,
        "specs": {
          "@type": "PropertyValue",
          "name": "Technical Specifications",
          "description": "Official manufacturer specifications"
        }
      }));

      // Create comparison dataset schema
      const comparisonSchema = {
        "@context": "https://schema.org",
        "@type": "Dataset",
        "name": selectedPhones.map(p => `${p.brand} ${p.model}`).join(" vs "),
        "description": `Detailed specification comparison between ${selectedPhones.map(p => `${p.brand} ${p.model}`).join(" and ")}. All specifications sourced from official manufacturer documentation.`,
        "url": window.location.href,
        "isBasedOn": "Official manufacturer product specifications",
        "hasPart": products
      };

      // Check if structured data already exists
      let structuredDataScript = document.querySelector('script[type="application/ld+json"]:not([data-product-schema])');
      if (structuredDataScript && structuredDataScript.textContent.includes('Dataset')) {
        // Dataset schema already exists, add product schema
        structuredDataScript = null;
      }

      // Add product schema if not already present
      const existingProductSchema = document.querySelector('script[data-product-schema="true"]');
      if (!existingProductSchema) {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-product-schema', 'true');
        script.textContent = JSON.stringify(comparisonSchema);
        document.head.appendChild(script);
      }
    } catch (error) {
      console.error('Error adding structured data:', error);
      // Gracefully fail - site still works without structured data
    }
  }

  // Display list of available phones (for phone-compare.html)
  async function displayPhonesList() {
    const phonesList = document.getElementById('phones-list');
    if (!phonesList) return;

    try {
      const phones = await fetchPhonesData();
      if (phones.length === 0) {
        phonesList.innerHTML = '<li>No phones available in database.</li>';
        return;
      }

      phonesList.innerHTML = phones
        .map(phone => `<li>${phone.brand} ${phone.model} (ID: <code>${phone.id}</code>)</li>`)
        .join('');
    } catch (error) {
      phonesList.innerHTML = '<li>Error loading phone list.</li>';
    }
  }

  // Flatten nested object values for display
  function flattenValue(value) {
    if (value === null || value === undefined) {
      return '—';
    }
    if (typeof value === 'object') {
      return Object.values(value).filter(v => v).join(' / ');
    }
    return String(value);
  }

  // Update page title and meta description for programmatic pages
  function updatePageMeta(selectedPhones) {
    if (selectedPhones.length === 0) return;

    // Build comparison string (e.g., "Pixel 10 vs Pixel 10 Pro")
    const models = selectedPhones.map(p => `${p.brand} ${p.model}`).join(' vs ');
    
    // Update title
    const titleElement = document.querySelector('title');
    if (titleElement) {
      titleElement.textContent = `${models} – Specs Comparison – SpecLedger`;
    }

    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        'content',
        `Compare ${models} side-by-side using official manufacturer specifications. SpecLedger provides specification-based product comparisons.`
      );
    }

    // Update H1 heading
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
      pageTitle.textContent = models;
    }
  }

  // Generate comparison table from selected phones
  async function generateComparisonTable() {
    const selectedIds = getComparisonIds();
    const tableHeader = document.getElementById('header-row');
    const tableBody = document.getElementById('table-body');
    const errorMessage = document.getElementById('error-message');

    if (!tableHeader || !tableBody) return;

    try {
      const phones = await fetchPhonesData();

      if (selectedIds.length === 0) {
        tableBody.innerHTML = '<tr><td class="spec-label">Select phones to compare using URL parameters (e.g., ?ids=google-pixel-10,google-pixel-10-pro)</td></tr>';
        return;
      }

      // Find selected phones
      const selectedPhones = selectedIds
        .map(id => phones.find(p => p.id === id))
        .filter(p => p !== undefined);

      if (selectedPhones.length === 0) {
        errorMessage.textContent = 'No valid phone IDs found. Check the available phones list below.';
        errorMessage.style.display = 'block';
        tableBody.innerHTML = '<tr><td class="spec-label">No phones found with provided IDs.</td></tr>';
        return;
      }

      // Update page meta for programmatic pages
      updatePageMeta(selectedPhones);

      // Add structured data for SEO
      addStructuredData(selectedPhones);

      // Build header row with phone names
      tableHeader.innerHTML = '<th class="spec-label">Specification</th>' +
        selectedPhones
          .map(phone => `<th class="phone-header">${phone.brand}<br><strong>${phone.model}</strong></th>`)
          .join('');

      // Collect all unique specification keys from selected phones
      const allSpecs = new Set();
      selectedPhones.forEach(phone => {
        Object.keys(phone).forEach(key => {
          if (key !== 'id' && key !== 'source_url') {
            allSpecs.add(key);
          }
        });
      });

      // Define spec display order and labels
      const specOrder = [
        'brand', 'model', 'release_year',
        'display', 'chipset', 'ram_gb', 'storage_gb',
        'battery_mah', 'camera', 'os'
      ];

      const specLabels = {
        'brand': 'Brand',
        'model': 'Model',
        'release_year': 'Release Year',
        'display': 'Display',
        'chipset': 'Chipset',
        'ram_gb': 'RAM',
        'storage_gb': 'Storage',
        'battery_mah': 'Battery',
        'camera': 'Camera',
        'os': 'Operating System'
      };

      // Build table rows in defined order
      tableBody.innerHTML = specOrder
        .filter(spec => allSpecs.has(spec))
        .map(spec => {
          const label = specLabels[spec] || spec;
          const cells = selectedPhones
            .map(phone => `<td>${flattenValue(phone[spec])}</td>`)
            .join('');
          return `<tr><th class="spec-label">${label}</th>${cells}</tr>`;
        })
        .join('');

      // Add source URL row
      const sourceRow = '<tr><th class="spec-label">Source</th>' +
        selectedPhones
          .map(phone => `<td><a href="${phone.source_url}" target="_blank" rel="noopener">View Specs</a></td>`)
          .join('') +
        '</tr>';
      tableBody.innerHTML += sourceRow;

      errorMessage.style.display = 'none';
    } catch (error) {
      console.error('Error generating comparison table:', error);
      errorMessage.textContent = 'Error loading comparison data. Please try again.';
      errorMessage.style.display = 'block';
      tableBody.innerHTML = '<tr><td class="spec-label">Error loading data.</td></tr>';
    }
  }

  // Initialize site on page load
  function init() {
    // Apply SEO hardening to all pages
    setRobotsMeta();
    setCanonicalUrl();

    // Check if we're on a comparison page
    const comparisonTable = document.getElementById('comparison-table');
    if (comparisonTable) {
      generateComparisonTable();
      
      // Display phones list only on phone-compare.html (dynamic page)
      const phonesList = document.getElementById('phones-list');
      if (phonesList) {
        displayPhonesList();
      }
    }
  }

  // Run initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
