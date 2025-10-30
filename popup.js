// ========== CONTENT EXTRACTION FUNCTION (runs in page context) ==========
function extractPageContent() {
  // Helper: Check if element is visible
  function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    return el.offsetParent !== null || style.position === 'fixed';
  }

  // Helper: Check if element should be excluded (boilerplate)
  function shouldExclude(el) {
    const tag = el.tagName.toLowerCase();
    const excludeTags = ['nav', 'header', 'footer', 'aside', 'form', 'script', 'style', 'noscript', 'svg'];
    if (excludeTags.includes(tag)) return true;
    if (el.hasAttribute('aria-hidden') || el.hasAttribute('hidden')) return true;
    const style = el.getAttribute('style') || '';
    if (style.includes('display:none') || style.includes('visibility:hidden')) return true;
    return false;
  }

  // Helper: Find main content region
  function getContentRegion() {
    const selectors = ['main', 'article', '[role="main"]', '[itemprop="articleBody"]'];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && isVisible(el)) return el;
    }
    return document.body;
  }

  // Helper: Get clean text from element (for word count and bodies)
  function getCleanText(el) {
    if (!el) return '';
    const clone = el.cloneNode(true);
    // Remove excluded elements
    const toRemove = clone.querySelectorAll('nav, header, footer, aside, form, script, style, noscript, svg, [aria-hidden], [hidden]');
    toRemove.forEach(node => node.remove());
    // Remove hidden elements by style
    const allEls = clone.querySelectorAll('*');
    allEls.forEach(node => {
      const style = node.getAttribute('style') || '';
      if (style.includes('display:none') || style.includes('visibility:hidden')) {
        node.remove();
      }
    });
    return clone.innerText || clone.textContent || '';
  }

  // Helper: Extract heading with body text
  function extractHeadingWithBody(headingEl, contentRegion) {
    const heading = getCleanText(headingEl).trim();
    const level = parseInt(headingEl.tagName[1]);
    
    // Find all text until next heading of same or higher level
    let body = '';
    let currentEl = headingEl.nextElementSibling;
    while (currentEl) {
      if (currentEl.tagName.match(/^H[1-6]$/)) {
        const nextLevel = parseInt(currentEl.tagName[1]);
        if (nextLevel <= level) break; // Stop at same or higher level heading
      }
      if (!shouldExclude(currentEl) && isVisible(currentEl)) {
        body += getCleanText(currentEl).trim() + '\n';
      }
      currentEl = currentEl.nextElementSibling;
    }
    return { heading: heading.trim(), body: body.trim() };
  }

  // Extract meta data
  const metaTitle = document.querySelector('meta[name="og:title"]')?.getAttribute('content') ||
                    document.querySelector('title')?.innerText ||
                    'No title';
  const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') ||
                   document.querySelector('meta[name="og:description"]')?.getAttribute('content') ||
                   'No description';
  const url = window.location.href;
  const hostname = window.location.hostname;

  // Count words in main content region
  const contentRegion = getContentRegion();
  const cleanText = getCleanText(contentRegion);
  const wordCount = cleanText.split(/\s+/).filter(word => word.length > 0).length;

  // Extract headings (H1-H3) with bodies
  const headings = [];
  const headingEls = contentRegion.querySelectorAll('h1, h2, h3');
  headingEls.forEach(headingEl => {
    if (!shouldExclude(headingEl) && isVisible(headingEl)) {
      const { heading, body } = extractHeadingWithBody(headingEl, contentRegion);
      if (heading) {
        headings.push({
          tag: headingEl.tagName.toLowerCase(),
          heading: heading,
          body: body
        });
      }
    }
  });

  // Extract links
  const links = [];
  const linkEls = contentRegion.querySelectorAll('a[href]');
  linkEls.forEach(linkEl => {
    if (!shouldExclude(linkEl) && isVisible(linkEl)) {
      const href = linkEl.href || '';
      const text = getCleanText(linkEl).trim() || linkEl.getAttribute('title') || 'Link';
      const isInternal = href.startsWith(window.location.origin) || href.startsWith('/');
      const nofollow = linkEl.hasAttribute('rel') && linkEl.getAttribute('rel').includes('nofollow');
      links.push({
        url: href,
        text: text,
        internal: isInternal,
        nofollow: nofollow
      });
    }
  });

  return {
    metaTitle,
    metaDesc,
    url,
    hostname,
    wordCount,
    headings,
    links
  };
}

// ========== POPUP SCRIPT ==========

let pageData = null;
let allLinks = [];

// Initialize on popup load
document.addEventListener('DOMContentLoaded', async () => {
  await loadPageData();
  renderOverview();
  renderHeadings();
  renderLinks();
  attachEventListeners();
});

// Load page data via content script
async function loadPageData() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: extractPageContent
    });
    pageData = results[0].result;
    allLinks = pageData.links;
  } catch (error) {
    console.error('Error loading page data:', error);
    document.getElementById('overview-content').innerHTML = '<p>Error loading page content.</p>';
  }
}

// Render Overview Section
function renderOverview() {
  const overviewHtml = `
    <div class="meta-box">
      <span class="meta-box-label">Meta Title</span>
      <div class="meta-box-value">${escapeHtml(pageData.metaTitle)}</div>
    </div>
    <div class="meta-box">
      <span class="meta-box-label">Meta Description</span>
      <div class="meta-box-value">${escapeHtml(pageData.metaDesc)}</div>
    </div>
    <div class="meta-box">
      <span class="meta-box-label">Page URL</span>
      <div class="meta-box-value"><a href="${pageData.url}" target="_blank" style="color: #0066cc; text-decoration: none;">${escapeHtml(pageData.url)}</a></div>
    </div>
    <div style="margin-top: var(--spacing-md);">
      <span class="badge badge-count">ðŸ“Š Word Count: ${pageData.wordCount.toLocaleString()}</span>
      <span class="badge badge-count">ðŸ“ Headings: ${pageData.headings.length}</span>
      <span class="badge badge-count">ðŸ”— Links: ${pageData.links.length}</span>
    </div>
  `;
  document.getElementById('overview-content').innerHTML = overviewHtml;
}

// Render Content Hierarchy Section
function renderHeadings() {
  if (pageData.headings.length === 0) {
    document.getElementById('headings-content').innerHTML = '<p>No headings found.</p>';
    return;
  }

  const headingsHtml = pageData.headings.map((heading, idx) => {
    const tag = heading.tag.toUpperCase();
    return `
      <div class="heading-block" data-idx="${idx}">
        <div class="heading-row" onclick="toggleHeadingBody(${idx})">
          <span class="heading-toggle">+</span>
          <span class="heading-tag">${tag}</span>
          <span class="heading-text">${escapeHtml(heading.heading)}</span>
        </div>
        <div class="heading-body hidden" id="heading-body-${idx}">
${escapeHtml(heading.body)}
        </div>
      </div>
    `;
  }).join('');
  document.getElementById('headings-content').innerHTML = headingsHtml;
}

// Render Links Section
function renderLinks() {
  const linksSummary = `
    <div style="margin-bottom: var(--spacing-md);">
      <span class="badge badge-count">Total: ${allLinks.length}</span>
      <span class="badge badge-internal">Internal: ${allLinks.filter(l => l.internal).length}</span>
      <span class="badge badge-external">External: ${allLinks.filter(l => !l.internal).length}</span>
      <span class="badge badge-follow">Follow: ${allLinks.filter(l => !l.nofollow).length}</span>
      <span class="badge badge-nofollow">Nofollow: ${allLinks.filter(l => l.nofollow).length}</span>
    </div>
  `;
  document.getElementById('links-filter-container').innerHTML = linksSummary + renderFilterButtons();
  
  const linksHtml = allLinks.map((link, idx) => {
    const internalClass = link.internal ? 'true' : 'false';
    const nofollowClass = link.nofollow ? 'true' : 'false';
    return `
      <div class="link-block" data-internal="${internalClass}" data-nofollow="${nofollowClass}" id="link-${idx}">
        <div class="link-url" title="${escapeHtml(link.url)}">${escapeHtml(link.url)}</div>
        <div class="link-text">${escapeHtml(link.text)}</div>
        <div class="link-badges">
          <span class="badge ${link.internal ? 'badge-internal' : 'badge-external'}">
            ${link.internal ? 'INTERNAL' : 'EXTERNAL'}
          </span>
          <span class="badge ${link.nofollow ? 'badge-nofollow' : 'badge-follow'}">
            ${link.nofollow ? 'NOFOLLOW' : 'FOLLOW'}
          </span>
        </div>
      </div>
    `;
  }).join('');
  document.getElementById('links-content').innerHTML = linksHtml;
}

// Render Filter Buttons
function renderFilterButtons() {
  return `
    <div class="filter-row">
      <button type="button" class="filter-btn active" data-filter="all" onclick="filterLinks(this, 'all')">All</button>
      <button type="button" class="filter-btn" data-filter="internal" onclick="filterLinks(this, 'internal')">Internal</button>
      <button type="button" class="filter-btn" data-filter="external" onclick="filterLinks(this, 'external')">External</button>
      <button type="button" class="filter-btn" data-filter="follow" onclick="filterLinks(this, 'follow')">Dofollow</button>
      <button type="button" class="filter-btn" data-filter="nofollow" onclick="filterLinks(this, 'nofollow')">Nofollow</button>
    </div>
  `;
}

// Toggle Heading Body
function toggleHeadingBody(idx) {
  const body = document.getElementById(`heading-body-${idx}`);
  const row = document.querySelector(`[data-idx="${idx}"] .heading-row`);
  const toggle = row.querySelector('.heading-toggle');
  body.classList.toggle('hidden');
  toggle.textContent = body.classList.contains('hidden') ? '+' : '-';
}

// Filter Links
function filterLinks(btn, filterType) {
  // Update active state
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  // Apply filter
  document.querySelectorAll('.link-block').forEach(block => {
    const internal = block.getAttribute('data-internal') === 'true';
    const nofollow = block.getAttribute('data-nofollow') === 'true';
    let show = true;

    if (filterType === 'internal') show = internal;
    else if (filterType === 'external') show = !internal;
    else if (filterType === 'follow') show = !nofollow;
    else if (filterType === 'nofollow') show = nofollow;
    // 'all' shows all

    if (show) {
      block.classList.remove('hidden');
    } else {
      block.classList.add('hidden');
    }
  });
}

// Print Report
document.getElementById('print-btn')?.addEventListener('click', () => {
  window.print();
});

// Export Headings CSV
document.getElementById('export-headings-btn')?.addEventListener('click', () => {
  const csv = generateHeadingsCSV();
  downloadCSV(csv, 'headings');
});

// Export Links CSV
document.getElementById('export-links-btn')?.addEventListener('click', () => {
  const csv = generateLinksCSV();
  downloadCSV(csv, 'links');
});

// Generate Headings CSV
function generateHeadingsCSV() {
  const rows = [['Heading Level', 'Heading Text', 'Body Text']];
  pageData.headings.forEach(heading => {
    rows.push([
      heading.tag.toUpperCase(),
      `"${heading.heading.replace(/"/g, '""')}"`,
      `"${heading.body.replace(/"/g, '""').replace(/\n/g, ' ').substring(0, 500)}"`
    ]);
  });
  return rows.map(row => row.join(',')).join('\n');
}

// Generate Links CSV
function generateLinksCSV() {
  const rows = [['URL', 'Anchor Text', 'Internal', 'Follow']];
  pageData.links.forEach(link => {
    rows.push([
      `"${link.url.replace(/"/g, '""')}"`,
      `"${link.text.replace(/"/g, '""')}"`,
      link.internal ? 'Yes' : 'No',
      link.nofollow ? 'No' : 'Yes'
    ]);
  });
  return rows.map(row => row.join(',')).join('\n');
}

// Download CSV
function downloadCSV(csvContent, type) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const filename = `${pageData.hostname}-${type}-${timestamp}.csv`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Utility: Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Attach event listeners
function attachEventListeners() {
  // All listeners are attached inline in the render functions for simplicity
}