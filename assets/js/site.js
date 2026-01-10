// SpecLedger - Site JavaScript
// Phone comparison functionality and future enhancements

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

  // Display list of available phones
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

  // Generate comparison table from selected phones
  async function generateComparisonTable() {
    const selectedIds = getQueryParams();
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
    // Check if we're on the comparison page
    const comparisonTable = document.getElementById('comparison-table');
    if (comparisonTable) {
      generateComparisonTable();
      displayPhonesList();
    }
  }

  // Run initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
