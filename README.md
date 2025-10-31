# On-Page Content Report

A lightweight Chrome extension that pulls the on-page content of any webpage. Quickly extract and analyze meta tags, headings, content hierarchy, and links without leaving your browser.

**Built by [Lumos Digital Marketing Ltd](https://lumosdigital.co.uk)**
**If you'd like to support us, we would love it if you could donate [by using our ko-fi link](https://ko-fi.com/nahtanfromlumos)**

## Features

- **Meta Tag Extraction** - Instantly grab meta titles, descriptions, and page URLs
- **Content Hierarchy** - View all H1-H3 headings with their associated body content
- **Collapsible Sections** - Expand/collapse heading bodies for easy scanning
- **Link Analysis** - Extract all links with detailed classification
  - Internal vs. External detection
  - Follow/NoFollow attribution
  - Anchor text display
- **Word Count** - Get total page word count for content analysis
- **CSV Export** - Export headings and links as structured CSV files
- **Report in New Tab** - Generate a full HTML report in a new browser tab
- **Dark Mode Support** - Automatically adapts to your system theme
- **Responsive Design** - Works on any screen size

## Installation

1. Download the extension files to a folder
2. Open `chrome://extensions/` in your browser
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select the extension folder
5. The extension icon will appear in your toolbar

## Usage

1. Navigate to any webpage you want to audit
2. Click the **On-Page Content Report** icon in your toolbar
3. The popup will instantly load with:
   - **Overview** - Meta data and page statistics
   - **Content Hierarchy** - All headings with expandable body text
   - **Links** - Complete link inventory with classifications

### Export Data

- **Export Headings CSV** - Downloads heading structure with body text
- **Export Links CSV** - Downloads all links with metadata
- **Open Report in Tab** - Generates a formatted HTML report you can print or save

## File Structure

```
on-page-content-report/
├── manifest.json
├── popup.html
├── popup.js
├── images/
│   ├── icon-dark-16.png
│   ├── icon-dark-24.png
│   ├── icon-dark-32.png
│   └── icon-dark-128.png
└── README.md

```



## How It Works

### Content Extraction

The extension uses two main components:

1. **Content Script** (`extractPageContent()`) - Runs in the page context to safely access DOM elements
   - Identifies main content region (article, main, or body)
   - Excludes navigation, headers, footers, and boilerplate
   - Captures visible, semantic content only

2. **Popup Script** (`popup.js`) - Renders the audit interface
   - Displays extracted data in an organized, scannable format
   - Handles exports and report generation
   - Manages user interactions

### Heading Body Detection

The extension automatically collects body text following each heading until it encounters:
- A heading of equal or higher level (H1/H2,H2/H3)
- The end of the content region
- Excluded elements (nav, footer, etc.)

This allows for clean content hierarchy analysis without manual parsing.

## Permissions

- `activeTab` - Required to access the current tab's content
- `scripting` - Required to inject and execute content extraction script
- `tabs` - Required to create new tabs for reports

## Browser Compatibility

- Chrome 88+
- Brave Browser
- Edge (Chromium-based)
- Any Chromium-based browser supporting Manifest V3

## Data Privacy

This extension processes data entirely within your browser. No data is sent to external servers. All extraction happens locally, and reports are generated client-side.

## Future Enhancements

Potential additions to the roadmap:

- Image alt-text audit
- Schema markup detection
- H-tag hierarchy validation
- Internal link quality scoring
- Mobile-specific analysis
- Custom heading depth selection
- Batch page auditing

## Known Limitations

- Content scripts may not run on:
  - Chrome Web Store pages
  - Gmail and other Google services
  - Corporate/restricted intranets
  - Pages with strict Content Security Policy

- Medium and similar dynamic platforms (such as shopify or complicated woocommerce stores) may have difficulty with body text extraction due to complex DOM structures

## Support

For issues, feature requests, or questions:

- Visit [Lumos Digital Marketing](https://lumosdigital.co.uk)
- Email: info@lumos-digital.co.uk

## License

This extension is provided as-is for use by Lumos Digital Marketing Ltd and its clients.

---

**Version:** 1.0.0  
**Last Updated:** October 2025  
**Author:** Lumos Digital Marketing Ltd