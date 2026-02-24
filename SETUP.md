# Setup Guide

## Prerequisites

- A modern web browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- An internet connection (to fetch from Wikipedia's API)
- No backend, database, or API keys required

---

## Quick Start (Easiest)

### Option 1: Open Directly in Browser

```bash
# Clone or download the project
git clone https://github.com/yourusername/wikipedia-research-assistant.git
cd wikipedia-research-assistant/src

# Open directly in your browser
open index.html          # macOS
xdg-open index.html      # Linux
start index.html         # Windows
```

> ⚠️ Note: Opening `file://` directly may cause CORS issues in some browsers due to Wikipedia's API requiring an HTTP context. Use Option 2 for a better experience.

---

### Option 2: Use a Local HTTP Server (Recommended)

**Using Python (comes pre-installed on most systems):**

```bash
cd wikipedia-research-assistant/src

# Python 3
python -m http.server 3000

# Python 2
python -m SimpleHTTPServer 3000
```

Then open: [http://localhost:3000](http://localhost:3000)

---

**Using Node.js `npx serve`:**

```bash
cd wikipedia-research-assistant/src
npx serve .
```

Then open the URL shown in the terminal (usually `http://localhost:3000`).

---

**Using VS Code Live Server Extension:**

1. Install [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) in VS Code
2. Open the project folder in VS Code
3. Right-click `src/index.html` → **Open with Live Server**
4. Browser auto-opens at `http://127.0.0.1:5500`

---

**Using Node.js `http-server`:**

```bash
npm install -g http-server
cd wikipedia-research-assistant/src
http-server -p 3000
```

---

## Project Structure

```
wikipedia-research-assistant/
│
├── src/                        # Source files (serve this directory)
│   ├── index.html              # Main HTML — app entry point
│   ├── styles.css              # All styles (CSS variables, layout, components)
│   └── app.js                  # All JavaScript (Services + UI + App logic)
│
├── docs/                       # Documentation
│   ├── ARCHITECTURE.md         # System design and data flow diagrams
│   ├── API_REFERENCE.md        # Complete function/method reference
│   └── SETUP.md                # This file
│
├── tests/                      # Test specifications
│   └── test_plan.md            # Manual test plan and test cases
│
├── public/                     # Static assets (optional)
│
└── README.md                   # Project overview
```

---

## Configuration

The app works out of the box with no configuration. All settings are in `src/app.js`:

```js
// In WikipediaService:
const BASE = 'https://en.wikipedia.org/api/rest_v1';      // Wikipedia REST API
const SEARCH_BASE = 'https://en.wikipedia.org/w/api.php'; // MediaWiki API

// In StorageService:
const MAX_HISTORY = 30;  // Maximum history entries to keep
```

To use a different Wikipedia language, change the base URL:
```js
// Spanish Wikipedia
const BASE = 'https://es.wikipedia.org/api/rest_v1';
const SEARCH_BASE = 'https://es.wikipedia.org/w/api.php';
```

---

## Browser Compatibility

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Chrome | 90+ | Fully supported |
| Firefox | 88+ | Fully supported |
| Safari | 14+ | Fully supported |
| Edge | 90+ | Fully supported |
| Opera | 76+ | Fully supported |

**Features used:**
- `fetch()` API
- `localStorage`
- CSS Grid & Flexbox
- CSS Custom Properties (Variables)
- CSS Animations
- `URLSearchParams`
- `async/await`

---

## Deploying to Production

### Deploy to GitHub Pages

```bash
# Ensure src/ contains index.html, styles.css, app.js
git add .
git commit -m "Deploy Wikipedia Research Assistant"
git push origin main

# In GitHub Settings → Pages → Source: main branch / (root or /src)
```

### Deploy to Netlify (Drag & Drop)

1. Go to [netlify.com/drop](https://app.netlify.com/drop)
2. Drag the `src/` folder onto the page
3. Your app is live in seconds with a shareable URL

### Deploy to Vercel

```bash
npm install -g vercel
cd wikipedia-research-assistant/src
vercel --prod
```

### Deploy to any static host

Upload only the `src/` folder contents (`index.html`, `styles.css`, `app.js`) to any static hosting service.

---

## Troubleshooting

### "No results found" for a valid topic
- Try a more specific term (e.g., "Machine Learning" instead of "ML")
- Use exact Wikipedia title spellings
- Avoid abbreviations in initial searches

### CORS errors in browser console
- Open the app through a local HTTP server (not `file://`)
- See Option 2 in Quick Start above

### localStorage not saving data
- Some browsers block localStorage in private/incognito mode
- Ensure you're not in a restrictive browser security context

### Fonts not loading
- Requires internet connection for Google Fonts
- App is fully functional without fonts; fallback serif/monospace are used
