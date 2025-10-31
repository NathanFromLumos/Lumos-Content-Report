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

  // Extract headings (H1-H3) with bodies - SIMPLIFIED
const headings = [];
const headingEls = contentRegion.querySelectorAll('h1, h2, h3');

headingEls.forEach((headingEl, idx) => {
  if (!shouldExclude(headingEl) && isVisible(headingEl)) {
    const headingText = getCleanText(headingEl).trim();
    
    if (headingText && headingText.length > 0) {
      const level = parseInt(headingEl.tagName[1]);
      
      // Create a temporary container with the heading and everything after it
      const tempDiv = document.createElement('div');
      let current = headingEl.nextElementSibling;
      let elementCount = 0;
      
      // Grab next 50 siblings
      while (current && elementCount < 50) {
        const tagName = current.tagName.toLowerCase();
        
        // Stop at next heading of same/higher level
        if (tagName.match(/^h[1-6]$/)) {
          const nextLevel = parseInt(current.tagName[1]);
          if (nextLevel <= level) break;
        }
        
        // Clone and add to temp container (don't skip anything)
        tempDiv.appendChild(current.cloneNode(true));
        current = current.nextElementSibling;
        elementCount++;
      }
      
      // Extract all text from temp container
      let body = getCleanText(tempDiv).trim();
      
      // Also grab any img alt text specifically
      const imgAltTexts = [];
      tempDiv.querySelectorAll('img[alt]').forEach(img => {
        const alt = img.getAttribute('alt').trim();
        if (alt) imgAltTexts.push('[IMAGE: ' + alt + ']');
      });
      if (imgAltTexts.length > 0) {
        body = imgAltTexts.join('\n') + '\n' + body;
      }
      
      headings.push({
        tag: headingEl.tagName.toLowerCase(),
        heading: headingText,
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
  try {
    await loadPageData();
    if (pageData.error) {
      document.getElementById('overview-content').innerHTML = `<p style="color: red;">Error: ${pageData.error}</p>`;
      return;
    }
    renderOverview();
    renderHeadings();
    renderLinks();
    attachEventListeners();
    attachButtonListeners();
  } catch (error) {
    console.error('Popup error:', error);
    document.body.innerHTML = `<p style="color: red; padding: 20px;">Error loading page  ${error.message}</p>`;
  }
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
    pageData = { error: error.message };
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
      <span class="badge badge-count">Word Count: ${pageData.wordCount.toLocaleString()}</span>
      <span class="badge badge-count">Headings: ${pageData.headings.length}</span>
      <span class="badge badge-count">Links: ${pageData.links.length}</span>
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
        <div class="heading-row" data-heading-idx="${idx}">
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
  
  // Attach event listeners AFTER rendering
  document.querySelectorAll('.heading-row').forEach(row => {
    row.addEventListener('click', function() {
      const idx = this.getAttribute('data-heading-idx');
      toggleHeadingBody(idx);
    });
  });
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
  
  document.getElementById('links-content').innerHTML = linksSummary + linksHtml;
}

// Toggle Heading Body
function toggleHeadingBody(idx) {
  const body = document.getElementById(`heading-body-${idx}`);
  const row = document.querySelector(`[data-heading-idx="${idx}"]`);
  const toggle = row.querySelector('.heading-toggle');
  body.classList.toggle('hidden');
  toggle.textContent = body.classList.contains('hidden') ? '+' : '-';
}


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

// Generate full HTML report
function generateReportHTML() {
  const headingsHtml = pageData.headings.map(heading => {
    const tag = heading.tag.toUpperCase();
    return `
      <div style="margin-bottom: 20px; border: 1px solid #e0e0e0; padding: 15px; border-radius: 6px;">
        <div style="font-weight: 700; margin-bottom: 8px;">
          <span style="background: #384c55; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; margin-right: 8px;">${tag}</span>
          ${escapeHtml(heading.heading)}
        </div>
        <div style="color: #666; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">
          ${escapeHtml(heading.body)}
        </div>
      </div>
    `;
  }).join('');

  const linksHtml = pageData.links.map(link => `
    <div style="margin-bottom: 12px; padding: 12px; background: #fafafa; border-radius: 6px;">
      <div style="font-size: 12px; color: #0066cc; margin-bottom: 4px; word-break: break-all;">
        ${escapeHtml(link.url)}
      </div>
      <div style="font-size: 13px; margin-bottom: 6px;">
        ${escapeHtml(link.text)}
      </div>
      <div>
        <span style="background: ${link.internal ? '#28966B' : '#f0ad4e'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; margin-right: 6px;">
          ${link.internal ? 'INTERNAL' : 'EXTERNAL'}
        </span>
        <span style="background: ${link.nofollow ? '#d4a5a5' : '#28966B'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;">
          ${link.nofollow ? 'NOFOLLOW' : 'FOLLOW'}
        </span>
      </div>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>SEO Audit Report - ${pageData.hostname}</title>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: 'Inter', sans-serif;
          max-width: 900px;
          margin: 0 auto;
          padding: 40px 20px;
          background-color: #f5f5f5;
          color: #161616;
        }
        .header {
          background: #384c55;
          color: #f5f5f5;
          padding: 30px;
          border-radius: 8px;
          margin-bottom: 30px;
          text-align: center;
        }
        .header h1 {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 32px;
          margin: 0 0 10px 0;
        }
        .header p {
          margin: 5px 0;
          opacity: 0.9;
        }
        .section {
          background: white;
          padding: 25px;
          margin-bottom: 25px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .section h2 {
          font-family: 'Space Grotesk', sans-serif;
          color: #384c55;
          border-bottom: 3px solid #384c55;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        .meta-box {
          background: #fafafa;
          border-left: 4px solid #28966B;
          padding: 15px;
          margin-bottom: 15px;
          border-radius: 4px;
        }
        .meta-label {
          font-weight: 700;
          color: #384c55;
          font-size: 12px;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .badges {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 15px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>SEO Audit Report</h1>
        <p>Powered by Lumos Digital Marketing Ltd</p>
        <p style="font-size: 12px; margin-top: 15px;">${pageData.hostname}</p>
      </div>

      <div class="section">
        <h2>Overview</h2>
        <div class="meta-box">
          <div class="meta-label">Meta Title</div>
          <div>${escapeHtml(pageData.metaTitle)}</div>
        </div>
        <div class="meta-box">
          <div class="meta-label">Meta Description</div>
          <div>${escapeHtml(pageData.metaDesc)}</div>
        </div>
        <div class="meta-box">
          <div class="meta-label">Page URL</div>
          <div style="word-break: break-all;"><a href="${pageData.url}" target="_blank" style="color: #0066cc;">${escapeHtml(pageData.url)}</a></div>
        </div>
        <div class="badges">
          <span style="border: 2px solid #384c55; padding: 8px 14px; border-radius: 20px; font-weight: 600;">Word Count: ${pageData.wordCount.toLocaleString()}</span>
          <span style="border: 2px solid #384c55; padding: 8px 14px; border-radius: 20px; font-weight: 600;">Headings: ${pageData.headings.length}</span>
          <span style="border: 2px solid #384c55; padding: 8px 14px; border-radius: 20px; font-weight: 600;">Links: ${pageData.links.length}</span>
        </div>
      </div>

      <div class="section">
        <h2>Content Hierarchy</h2>
        ${headingsHtml}
      </div>

      <div class="section">
        <h2>Links</h2>
        ${linksHtml}
      </div>
    </body>
    </html>
  `;
}


// Utility: Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Attach event listeners
function attachEventListeners() {
  // All listeners attached above
}
// Attach button listeners (called after DOM is ready)
function attachButtonListeners() {
  const exportHeadingsBtn = document.getElementById('export-headings-btn');
  const exportLinksBtn = document.getElementById('export-links-btn');
  const openTabBtn = document.getElementById('open-tab-btn');
  
  if (exportHeadingsBtn) {
    exportHeadingsBtn.addEventListener('click', () => {
      const csv = generateHeadingsCSV();
      downloadCSV(csv, 'headings');
    });
  }
  
  if (exportLinksBtn) {
    exportLinksBtn.addEventListener('click', () => {
      const csv = generateLinksCSV();
      downloadCSV(csv, 'links');
    });
  }
  
  if (openTabBtn) {
    openTabBtn.addEventListener('click', () => {
      const reportHTML = generateReportHTML();
      const blob = new Blob([reportHTML], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      chrome.tabs.create({ url: url });
    });
  }
}
