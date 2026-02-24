# 🔍 WikiResearch — AI-Powered Wikipedia Research Assistant

> A clean, intelligent research tool that pulls real-time knowledge from Wikipedia. Ask any question, explore topics, save articles, and navigate knowledge — all from a single elegant interface. No backend. No API key. No build step.

![Version](https://img.shields.io/badge/version-1.0.0-gold)
![Stack](https://img.shields.io/badge/stack-Vanilla%20JS%20%2B%20HTML%20%2B%20CSS-blue)
![API](https://img.shields.io/badge/API-Wikipedia%20REST-orange)
![License](https://img.shields.io/badge/license-MIT-green)
![No Build](https://img.shields.io/badge/build-none%20required-lightgrey)
![Zero Dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen)

---

## 📋 Table of Contents

1. [About the Project](#about-the-project)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [File Descriptions](#file-descriptions)
6. [Architecture](#architecture)
7. [How It Works](#how-it-works)
8. [Quick Start](#quick-start)
9. [Wikipedia API Details](#wikipedia-api-details)
10. [Error Handling](#error-handling)
11. [Deployment](#deployment)
12. [Testing](#testing)
13. [Possible Extensions](#possible-extensions)
14. [Contributing](#contributing)
15. [License](#license)

---

## 🧠 About the Project

**WikiResearch** is a portfolio-grade, pure frontend web application that lets users research any topic in natural language and get structured, readable answers pulled live from Wikipedia's public API.

This project demonstrates:
- **Real-time data ingestion** from a public REST API (no dataset needed)
- **Multi-endpoint API orchestration** — search → summary → related links in sequence
- **Resilient error handling** with automatic retries and dual-API fallbacks
- **Clean 3-layer software architecture** (Data Service → Storage → UI Controller) without any framework
- **Modern vanilla JavaScript** — async/await, closures, IIFE module pattern, Promise.all
- **Production-quality UI** — dark editorial theme, CSS animations, responsive design

It was built as a **Data Analyst / Developer portfolio project** to showcase API integration, data pipeline thinking, and frontend engineering without relying on libraries or frameworks.

---

## ✨ Features

### Core Research Features
| Feature | Description |
|---------|-------------|
| 🔍 **Natural Language Search** | Ask full questions like "How does CRISPR work?" or "Who invented the internet?" — not just keywords |
| 📖 **Real-time Wikipedia Data** | Every search fetches fresh, live data directly from Wikipedia's REST API |
| 🧠 **Smart Content Parsing** | Long article text is automatically split into labelled collapsible sections (Overview, Background, Key Details, Further Context) |
| 🔗 **Related Topics** | Automatically surfaces up to 10 linked Wikipedia articles for deeper exploration |
| 🌐 **Direct Wikipedia Link** | Every result includes an "Open on Wikipedia" button to the full article |

### Navigation & Organization
| Feature | Description |
|---------|-------------|
| 📌 **Save Articles** | Bookmark any result to a persistent Saved list for later review |
| 🕓 **Search History** | All searches are automatically stored locally — nothing is ever lost |
| 🗂️ **3-Tab Interface** | Dedicated tabs for Search, History, and Saved Articles |
| ⚡ **Quick Topics** | Sidebar chip buttons for one-click search on popular topics |
| 💡 **Example Queries** | The welcome screen shows 3 clickable example queries for new users |

### Statistics & UX
| Feature | Description |
|---------|-------------|
| 📊 **Live Session Stats** | Sidebar shows live counts: total queries, saved articles, unique topics explored |
| ✅ **Saved Indicator** | The Save button visually changes state when an article is already bookmarked |
| 🔄 **Search Again** | History items are fully clickable — one click re-runs any past search |
| 📱 **Responsive Design** | Full layout adapts for desktop (1440px), tablet (900px), and mobile (375px) |
| ⌨️ **Keyboard Support** | Press Enter in the search box to trigger search — no mouse required |

### Robustness
| Feature | Description |
|---------|-------------|
| 🔁 **Automatic Retry** | If the top search result fails to load (redirect, 404), automatically tries the next 2 candidates |
| 🛡️ **Dual API Fallback** | Primary: Wikipedia REST API. Fallback: MediaWiki Extracts API. Always returns something useful |
| 💬 **Smart Error Messages** | Different, specific messages for: no results, network failure, file:// protocol errors, article not found |
| 🌐 **Snippet Fallback** | If no full extract is available, uses the search snippet text — results never show blank |

---

## 🛠️ Tech Stack

| Layer | Technology | Why Chosen |
|-------|-----------|------------|
| **Structure** | HTML5 | Semantic, accessible, no transpiling needed |
| **Styling** | CSS3 (Custom Properties, Grid, Flexbox, Animations) | Full styling power, zero preprocessors |
| **Logic** | Vanilla JavaScript ES2020 | No framework overhead; demonstrates pure JS architecture skills |
| **Fonts** | Google Fonts (CDN) | Playfair Display · IBM Plex Mono · Source Serif 4 |
| **Data Source** | Wikipedia REST API v1 + MediaWiki API | Free, public, no auth, CORS-enabled, always up-to-date |
| **Persistence** | Browser localStorage | Zero-dependency client-side storage |
| **Build System** | None — open index.html | Works instantly, zero config |
| **Dependencies** | Zero | No npm, no webpack, no React, no jQuery |

---

## 📁 Project Structure

```
wikipedia-research-assistant/
│
├── 📄 README.md                        ← Full project documentation (this file)
│
├── src/                                ← All source files — serve this directory
│   ├── index.html                      ← Main HTML shell and UI structure
│   ├── styles.css                      ← Complete stylesheet, zero preprocessors
│   └── app.js                          ← All logic: Services + UI Controller + App
│
├── docs/                               ← Technical documentation for developers
│   ├── ARCHITECTURE.md                 ← System design, module diagrams, data flow
│   ├── API_REFERENCE.md                ← Every function documented with examples
│   └── SETUP.md                        ← Setup, configuration, and deployment guide
│
├── tests/
│   └── test_plan.md                    ← 40+ test cases + console smoke test script
│
└── public/                             ← Reserved for static assets
```

---

## 📄 File Descriptions

---

### `src/index.html` — Application Shell

The main HTML file that defines the complete UI skeleton. It is structured as:

**`<head>` section:**
- Charset, viewport meta tags for mobile
- Google Fonts links for `Playfair Display`, `IBM Plex Mono`, and `Source Serif 4`
- Link to `styles.css`

**Background decorations (non-interactive):**
- `.bg-grid` — subtle CSS grid dot pattern overlaid on the background
- `.bg-orb` elements — two animated blurred radial gradient glows (amber + blue)

**`.sidebar` (Fixed left panel):**
- Logo with golden "W" icon and "WikiResearch / AI-Powered Assistant" text
- Navigation buttons: Search, History, Saved — with SVG icons
- Stats grid showing live Queries / Saved / Topics counts
- Quick topic chip buttons: AI, Quantum, Climate, Space, ML, DNA, Blockchain, History
- "Powered by Wikipedia API" footer label

**`.main-content` (Right scrollable area) — 3 Tab Panels:**

`#tab-search`:
- Page header with italic-accented title
- Search bar (`input` + Search `button`)
- `#loading-state` — 3-ring spinner with topic label (hidden by default)
- `#error-state` — warning icon + message + retry button (hidden by default)
- `#results-area` — full result with title, save/wiki buttons, summary card, accordion sections, related chips (hidden by default)
- `#empty-state` — welcome screen with animated "W" logo and example query buttons (shown by default)

`#tab-history`:
- Header + "Clear All" button
- `#history-list` — dynamically populated from localStorage

`#tab-saved`:
- Header + "Clear All" button
- `#saved-list` — dynamically populated from localStorage

All interactivity uses `onclick` attributes calling global functions defined in `app.js`.

---

### `src/styles.css` — Complete Stylesheet

A single self-contained CSS file (~360 lines) with no external dependencies. Organized as:

| Section | What It Contains |
|---------|-----------------|
| **CSS Variables** | All design tokens under `:root`: colors, fonts, spacing, border-radius, transitions |
| **Base Reset** | `box-sizing: border-box`, zero margin/padding, root font size |
| **Background Effects** | `.bg-grid` CSS grid pattern, `.bg-orb` blurred gradient glows with `orbFloat` animation |
| **App Layout** | Top-level Flexbox: fixed `.sidebar` + scrollable `.main-content` |
| **Sidebar Styles** | Logo, `.nav-btn` states (default, hover, active), stats grid, chips, footer |
| **Search Zone** | Search bar with focus glow + gold border, Search button with hover lift effect |
| **States** | Loading (3-ring spinner with `spin` keyframe), Error panel, Empty/welcome state with `pulse` animation |
| **Results** | Summary card with decorative quote-mark `::before`, `fadeUp` entrance animation, collapsible accordion sections |
| **History & Saved Lists** | `.list-card` with hover states, delete buttons, empty list text |
| **Custom Scrollbar** | Thin dark scrollbar matching the overall ink theme |
| **Responsive** | `@media (max-width: 900px)` for tablet, `@media (max-width: 640px)` for mobile |

**Design System:**
- Background: `#0d0d0f` (near-black ink)
- Primary Accent: `#d4a84b` (warm gold)
- Secondary: `#6eb5ff` (sky blue for related chips)
- Heading font: `Playfair Display` (serif, editorial)
- Label/stat font: `IBM Plex Mono` (monospace, technical)
- Body font: `Source Serif 4` (readable, refined)
- Aesthetic direction: **Editorial Dark** — like a premium research journal

---

### `src/app.js` — All Application Logic

The core JavaScript file (~510 lines). Uses the **IIFE (Immediately Invoked Function Expression)** module pattern throughout to encapsulate each layer. No global variable pollution. Structured into 3 service modules + global app functions:

---

#### `WikipediaService` — Data Layer

Handles all HTTP communication with Wikipedia. No API key required.

**`search(query)`**
- Calls: `GET /w/api.php?action=query&list=search&srsearch={query}&srlimit=5`
- Returns: Array of search result objects `[{title, snippet, pageid}, ...]`
- Error handling: wraps `fetch()` in try/catch; throws `TypeError('NETWORK_ERROR')` on connection failure so it can be classified upstream

**`getSummary(title)`**
- **Primary path:** `GET /api/rest_v1/page/summary/{title}` (Wikipedia REST API)
  - Fast, returns structured JSON with `extract`, `thumbnail`, `content_urls`
  - If extract is empty or too short, falls through to fallback
- **Fallback path:** `GET /w/api.php?action=query&prop=extracts&redirects=1`
  - Uses MediaWiki Extracts API which follows redirects automatically
  - Returns normalized object matching REST API shape
- This dual-path approach means articles with redirects (e.g. "AI" → "Artificial intelligence") never fail

**`getRelated(title)`**
- Calls: `GET /w/api.php?action=query&prop=links&titles={title}&pllimit=15`
- Returns: `string[]` of linked Wikipedia article titles (up to 10 used)
- Non-critical — failure returns empty array, never blocks main result

**`research(query)` — Main Orchestrator**
1. Calls `search(query)` to get up to 5 candidate article titles
2. Throws `Error('NO_RESULTS')` if array is empty
3. Loops through up to 3 candidates, calling `getSummary()` on each
4. Stops looping when a summary with 30+ character extract is found
5. If all 3 candidates fail: uses the search snippet text as the extract (never blank)
6. Calls `getRelated()` for the successful title
7. Returns a complete `ResearchResult` object

**ResearchResult shape:**
```js
{
  query: string,          // User's original query
  title: string,          // Wikipedia canonical title
  displayTitle: string,   // HTML display title (may include italics)
  extract: string,        // Plain text article summary
  thumbnail: string|null, // Image URL from Wikipedia (if available)
  wikiUrl: string,        // Full Wikipedia article URL
  related: string[],      // Up to 10 related article titles
  timestamp: string       // ISO 8601 timestamp
}
```

---

#### `StorageService` — Persistence Layer

Wraps `localStorage` with a clean, typed API. Synchronous — no Promises needed.

| Method | localStorage Key | Description |
|--------|-----------------|-------------|
| `getHistory()` | `wiki_history` | Returns array of history items, newest first. Catches JSON parse errors. |
| `addToHistory(result)` | `wiki_history` | Removes duplicate titles, prepends new item, trims to 30 entries max |
| `clearHistory()` | `wiki_history` | Calls `localStorage.removeItem()` |
| `getSaved()` | `wiki_saved` | Returns array of saved articles, newest first |
| `saveArticle(result)` | `wiki_saved` | Checks for duplicates first; returns `false` if already saved, `true` if newly saved |
| `removeFromSaved(title)` | `wiki_saved` | Filters by title and writes back |
| `clearSaved()` | `wiki_saved` | Calls `localStorage.removeItem()` |
| `isSaved(title)` | `wiki_saved` | Returns boolean; drives the Save button's visual state |

---

#### `UIController` — View Layer

All DOM manipulation lives here. Binds elements once in `init()`, then operates on cached refs.

**State Management — `showState(state)`**
Shows one panel, hides all others simultaneously:
- `'loading-state'` → shows spinner
- `'error-state'` → shows error panel
- `'results-area'` → shows result content
- `'empty-state'` → shows welcome screen
- `null` → hides all

**`renderResult(result)`**
- Sets `results-title` innerHTML (supports HTML in `displayTitle`)
- Updates Save button text and `.saved` class based on `StorageService.isSaved()`
- Sets Wikipedia link `href`
- Calls `renderSections(extract)` and `renderRelated(related)`
- Triggers `showState('results-area')` with `fadeUp` CSS animation

**`renderSections(extract)`**
- Splits extract text into sentences using regex `[^.!?]+[.!?]+`
- Groups sentences into 2–3 logical chunks based on total count
- Renders each chunk as a collapsible `<div class="section-card">` accordion
- Labels: Overview, Background, Key Details, Further Context
- If only 1 chunk, renders nothing (summary card is sufficient)

**`toggleSection(btn)`**
- Toggles `.open` class on `.section-body` sibling
- Swaps icon between `+` and `−`

**`renderHistoryList()` / `renderSavedList()`**
- Reads from `StorageService`
- Renders `.list-card` elements with title, date, action buttons
- Shows `.empty-list` placeholder if no items

**`updateStats()`**
- Reads history and saved arrays
- Counts unique topic "families" using a `Set` on first-word of title
- Updates `#stat-queries`, `#stat-saved`, `#stat-topics` text content

---

#### Global App Functions

Bound to `window` for use in inline HTML `onclick` attributes:

| Function | Triggered By | What It Does |
|----------|-------------|--------------|
| `handleSearch()` | Enter key / Search button | Main search pipeline: validates input → calls WikipediaService → renders result |
| `quickSearch(term)` | Sidebar chips, related chips, history cards | Switches to Search tab, fills input, triggers `handleSearch()` |
| `fillSearch(query)` | Example query buttons | Only fills the input — user still manually triggers search |
| `clearResults()` | Retry button (error state) | Clears input, shows empty state |
| `saveCurrentResult()` | Save button | Calls `StorageService.saveArticle()`, re-renders result to update button state |
| `removeSaved(title)` | Delete button in Saved tab | Calls `StorageService.removeFromSaved()`, re-renders saved list |
| `clearHistory()` | Clear All (History tab) | Shows browser confirm dialog, then clears |
| `clearSaved()` | Clear All (Saved tab) | Shows browser confirm dialog, then clears |
| `switchTab(tab)` | Nav buttons | Toggles `.active` class on tab panels and nav buttons; calls render methods for history/saved |

---

### `docs/ARCHITECTURE.md` — System Design Document

Contains:
- Full ASCII architecture diagram showing all 3 layers and external Wikipedia APIs
- Module responsibility table
- Complete request/response data flow diagram
- Wikipedia API endpoint reference table with all query parameters
- localStorage schema with example JSON structure for both `wiki_history` and `wiki_saved`
- Explanation of the dual-API fallback strategy for `getSummary()`

---

### `docs/API_REFERENCE.md` — Developer Function Reference

JSDoc-style documentation for every public method including:
- Function signature with typed parameters
- Return type and complete shape of returned objects
- Code examples showing actual usage
- Exact Wikipedia API endpoint and query parameters used by each method
- Error codes table: `NO_RESULTS`, `NETWORK_ERROR`, `404`, and their meanings
- Global functions reference table

---

### `docs/SETUP.md` — Setup & Deployment Guide

Complete instructions for:
- Why `file://` causes CORS errors and which Wikipedia API requests fail
- 4 local server options: Python 3, `npx serve`, VS Code Live Server, Node.js `http-server`
- How to change Wikipedia language (just swap the domain in `app.js`)
- Configuring `MAX_HISTORY` limit
- Deploying to GitHub Pages (2 methods), Netlify (drag & drop), Vercel CLI, any CDN
- Browser compatibility table with minimum versions
- Troubleshooting section: 4 common issues with solutions

---

### `tests/test_plan.md` — Test Plan

Structured test documentation covering:

**WikipediaService Tests (14 cases)**
- `search()`: returns results, handles question phrasing, empty string, obscure topics, result shape
- `getSummary()`: valid title, invalid title 404, titles with spaces, special characters
- `research()`: full pipeline, NO_RESULTS error, timestamp present, related is array, wikiUrl validity

**StorageService Tests (console script)**
- Paste-and-run browser console script testing all 8 methods
- Covers: add, duplicate prevention, save, duplicate save, isSaved, remove, clear

**UI Manual Tests (21 cases)**
- Search flow: empty state, example query click, Enter key, button click, empty input
- Navigation: all 3 tab switches, active state styling
- Saving: save button state, saved tab contents, duplicate prevention, removal, clear all
- Quick topics and related chip clicks
- Stats accuracy after each action

**Responsive Design Tests** — 4 viewport sizes

**Network Tests** — Normal, slow, and disconnected connection behaviors

**Edge Cases** — Unicode, very long queries, special characters, numbers only, XSS attempt

**Automated Smoke Test** — Single console script: 11 assertions, full pass/fail report

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                       BROWSER (Client-side only)                 │
│                                                                  │
│  ┌───────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  WikipediaService │  │  StorageService  │  │ UIController │  │
│  │  (Data Layer)     │  │  (Persistence)   │  │ (View Layer) │  │
│  │                   │  │                  │  │              │  │
│  │  search()         │  │  getHistory()    │  │ init()       │  │
│  │  getSummary()     │  │  addToHistory()  │  │ showState()  │  │
│  │  getRelated()     │  │  saveArticle()   │  │ render*()    │  │
│  │  research() ──────┼──┼──────────────────┼──▶ updateStats()│  │
│  └────────┬──────────┘  └──────────────────┘  └──────────────┘  │
│           │                                                      │
│           │            Global Functions                          │
│           │    handleSearch() · quickSearch() · switchTab()      │
└───────────┼──────────────────────────────────────────────────────┘
            │  HTTPS + CORS (origin: '*')
            ▼
┌──────────────────────────────────────────────────────────────────┐
│               Wikipedia Public APIs (Free, no auth)              │
│                                                                  │
│  ┌───────────────────────────┐  ┌────────────────────────────┐  │
│  │  REST API v1              │  │  MediaWiki API             │  │
│  │  /api/rest_v1/            │  │  /w/api.php                │  │
│  │                           │  │                            │  │
│  │  GET /page/summary/{title}│  │  action=query&list=search  │  │
│  │  → extract, thumbnail,    │  │  action=query&prop=links   │  │
│  │    content_urls           │  │  action=query&prop=extracts│  │
│  │  (Primary for summaries)  │  │  (Search + Fallback)       │  │
│  └───────────────────────────┘  └────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## ⚙️ How It Works

Complete lifecycle of a single search — `"How does machine learning work?"`:

```
1. USER INPUT
   └── Types query → presses Enter → handleSearch() fires

2. UI UPDATE
   └── UIController.showLoading("How does machine learning work?")
       → Spinner appears, Search button disabled

3. API ORCHESTRATION — WikipediaService.research(query)
   │
   ├── search("How does machine learning work?")
   │   └── GET /w/api.php?action=query&list=search&srsearch=...
   │       Returns: [{title:"Machine learning"}, {title:"Supervised learning"}, ...]
   │
   ├── getSummary("Machine learning")  ← Candidate #1
   │   ├── GET /api/rest_v1/page/summary/Machine_learning  ← Primary
   │   │   Returns: {extract: "Machine learning (ML) is...", thumbnail, url}
   │   │   extract.length > 30 ✅ — stop retrying
   │   └── (Fallback to MediaWiki API not needed here)
   │
   └── getRelated("Machine learning")  ← Runs in background
       └── GET /w/api.php?action=query&prop=links&titles=Machine+learning
           Returns: ["Deep learning", "Neural network", "Python", ...]

4. RESULT ASSEMBLED
   └── { query, title, extract, thumbnail, wikiUrl, related, timestamp }

5. PERSISTENCE
   └── StorageService.addToHistory(result) → saved to wiki_history in localStorage

6. RENDER
   └── UIController.renderResult(result)
       ├── Title + Wikipedia link + Save button
       ├── Summary card (full extract text)
       ├── Collapsible sections (Overview, Background, Key Details)
       └── Related topic chips (Deep learning, Neural network, ...)

7. STATS UPDATE
   └── UIController.updateStats() → Queries: 1, Topics: 1
```

---

## 🚀 Quick Start

### Prerequisites
- A modern web browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Internet connection (to reach Wikipedia's public API)
- Python 3 OR Node.js OR VS Code (any one of these for a local server)

### Option 1 — Python (Recommended, no install required)

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/wikipedia-research-assistant.git

# 2. Enter the src directory
cd wikipedia-research-assistant/src

# 3. Start a local HTTP server on port 3000
python -m http.server 3000

# 4. Open in your browser
#    Navigate to: http://localhost:3000
```

### Option 2 — Node.js (npx, no global install needed)

```bash
cd wikipedia-research-assistant/src
npx serve .
# Auto-opens — usually at http://localhost:3000
```

### Option 3 — VS Code Live Server Extension

1. Install [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) in VS Code
2. Open the `wikipedia-research-assistant/` folder in VS Code
3. Right-click `src/index.html` → **"Open with Live Server"**
4. Browser opens automatically at `http://127.0.0.1:5500`

### Option 4 — Node.js http-server (global)

```bash
npm install -g http-server
cd wikipedia-research-assistant/src
http-server -p 3000
# Open: http://localhost:3000
```

> ⚠️ **Do not open `index.html` by double-clicking** (file:// protocol). Wikipedia's API requires HTTP/HTTPS and will be blocked by CORS. The app will show an error explaining this.

---

## 🔌 Wikipedia API Details

Two public APIs are used — zero authentication required for either.

### Wikipedia REST API v1 (Primary)
| Property | Value |
|----------|-------|
| Base URL | `https://en.wikipedia.org/api/rest_v1` |
| Endpoint | `GET /page/summary/{title}` |
| Response fields used | `title`, `displaytitle`, `extract`, `thumbnail.source`, `content_urls.desktop.page` |
| Auth | None |
| CORS | Supported natively |

### MediaWiki Action API (Search + Fallback)
| Property | Value |
|----------|-------|
| Base URL | `https://en.wikipedia.org/w/api.php` |
| Required params | `format=json`, `origin=*` (for CORS) |
| Endpoints used | `action=query&list=search` (search), `action=query&prop=links` (related), `action=query&prop=extracts&redirects=1` (summary fallback) |
| Auth | None |

---

## 🛡️ Error Handling

Every failure scenario produces a specific, actionable error message:

| Scenario | Detected By | User-Facing Message |
|----------|-------------|---------------------|
| Query with no Wikipedia matches | `Error('NO_RESULTS')` | "No Wikipedia articles found for '...'. Try rephrasing or use a broader term." |
| No internet / DNS failure | `err instanceof TypeError` | "Could not reach Wikipedia. This usually happens when opening via file:// — try running through a local server." |
| Opened via `file://` protocol | Same TypeError | Same message — specifically mentions the file:// cause |
| Article title is a redirect or 404 | Caught in `research()` loop | Silently retries next candidate — user never sees this |
| All 3 candidates fail | Falls through | Uses search snippet text — result never shows blank |
| `getRelated()` fails | Silent catch | Related section simply absent — doesn't break result |
| Wikipedia returns HTTP error | `res.ok === false` | "Something went wrong: [status]. Please try again." |

---

## 🌍 Deployment

The app is 100% static. Deploy the 3 files in `src/` anywhere static hosting is supported.

### GitHub Pages
```bash
git add .
git commit -m "Deploy WikiResearch"
git push origin main
# GitHub Settings → Pages → Branch: main → Folder: /src → Save
```

### Netlify (Drag & Drop — fastest option)
1. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag the `src/` folder directly onto the page
3. Live URL generated immediately — share it anywhere

### Vercel CLI
```bash
npm install -g vercel
cd wikipedia-research-assistant/src
vercel --prod
```

### Any Static Host
Upload only three files: `index.html`, `styles.css`, `app.js` — nothing else needed.

---

## 🧪 Testing

### Quick Console Smoke Test

Open your browser, navigate to the running app, press `F12`, and paste this into the **Console** tab:

```js
(async () => {
  console.group('🔬 WikiResearch Smoke Tests');
  let pass = 0, fail = 0;

  const check = (condition, label) => {
    if (condition) { console.log(`✅ ${label}`); pass++; }
    else { console.error(`❌ ${label}`); fail++; }
  };

  try {
    // Research pipeline
    const result = await WikipediaService.research('machine learning');
    check(!!result.title, 'research() returns title');
    check(result.extract.length > 50, 'research() returns meaningful extract');
    check(Array.isArray(result.related), 'research() returns related array');
    check(result.wikiUrl.startsWith('https://'), 'research() returns valid URL');
    check(!!result.timestamp, 'research() returns timestamp');

    // Storage
    StorageService.clearHistory();
    StorageService.addToHistory(result);
    check(StorageService.getHistory().length === 1, 'addToHistory() saves item');
    StorageService.addToHistory(result); // duplicate
    check(StorageService.getHistory().length === 1, 'addToHistory() prevents duplicates');

    const saved = StorageService.saveArticle(result);
    check(saved === true, 'saveArticle() returns true on first save');
    check(StorageService.saveArticle(result) === false, 'saveArticle() returns false on duplicate');
    check(StorageService.isSaved(result.title) === true, 'isSaved() returns true');
    StorageService.removeFromSaved(result.title);
    check(StorageService.isSaved(result.title) === false, 'removeFromSaved() works');

    // NO_RESULTS error
    try {
      await WikipediaService.research('xkjhsdf_notreal_xyz999abc');
      check(false, 'NO_RESULTS error thrown');
    } catch(e) {
      check(e.message === 'NO_RESULTS', 'NO_RESULTS error thrown correctly');
    }

  } catch (err) {
    console.error('Unexpected test error:', err);
    fail++;
  }

  console.log(`\n📊 Results: ${pass} passed, ${fail} failed`);
  if (fail === 0) console.log('🎉 All tests passed!');
  console.groupEnd();
})();
```

Full manual test suite with 40+ test cases is in [`tests/test_plan.md`](./tests/test_plan.md).

---

## 🔮 Possible Extensions

| Extension | Difficulty | Description |
|-----------|------------|-------------|
| 🌐 **Multi-language** | Easy | Add a language selector to switch Wikipedia editions (ES, HI, FR, etc.) |
| 🌙 **Light Mode Toggle** | Easy | CSS variable swap for light/dark theme switch |
| 📰 **Article of the Day** | Easy | Fetch and show Wikipedia's featured article on the welcome screen |
| 📤 **Export to PDF** | Medium | Use `window.print()` with print CSS or jsPDF to export saved articles |
| 🎤 **Voice Search** | Medium | Integrate Web Speech API for microphone input |
| 🗂️ **Collections** | Medium | Organize saved articles into named folders stored in localStorage |
| 📊 **Reading Analytics** | Medium | Charts (Chart.js) showing searches per day, most explored topics |
| 🤖 **AI Summarizer** | Hard | Integrate Claude or OpenAI API to rephrase/condense Wikipedia extracts |
| 🔔 **Offline Mode** | Hard | Service Worker + Cache API for offline reading of saved articles |
| 🧩 **Browser Extension** | Hard | Repackage as Chrome/Firefox extension with popup UI |

---

## 🤝 Contributing

Contributions, bug reports, and feature requests are welcome!

```bash
# Fork the repo, then:
git checkout -b feature/my-feature
# Make changes in src/ files
git commit -m "feat: add light mode toggle"
git push origin feature/my-feature
# Open a Pull Request
```

**Guidelines:**
- Vanilla JS only — no frameworks or libraries
- Maintain the 3-layer architecture (Service / Storage / UI Controller)
- Add JSDoc comments for new public functions
- Test against the smoke test script before submitting

---

## 📜 License

MIT License — free to use, modify, and distribute for personal and commercial projects.

---

## 🙏 Credits

- **[Wikipedia](https://www.wikipedia.org/)** — Open REST API that powers all data retrieval
- **[Google Fonts](https://fonts.google.com/)** — Playfair Display, IBM Plex Mono, Source Serif 4
- Zero other dependencies — built entirely with browser-native APIs

---

## 👤 Author

**Vijay** — Aspiring Data Analyst & Full-Stack Developer
- GitHub: *[https://github.com/VijayKumaro7/WikiResearch-ResearchAnything-]*
- LinkedIn: *[https://www.linkedin.com/in/vijay-kumar070/]*


---

*WikiResearch — Research anything. Understand everything.*
