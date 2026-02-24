# Architecture Overview

## Wikipedia Research Assistant — System Design

```
┌─────────────────────────────────────────────────────────────┐
│                     BROWSER (Client)                        │
│                                                             │
│  ┌──────────────┐   ┌───────────────┐   ┌───────────────┐  │
│  │ UIController │   │WikipediaService│   │StorageService │  │
│  │              │   │               │   │               │  │
│  │ - Tab mgmt   │──▶│ - Search API  │   │ - History     │  │
│  │ - Rendering  │   │ - Summaries   │   │ - Saved items │  │
│  │ - Events     │   │ - Related     │   │ - localStorage│  │
│  └──────┬───────┘   └───────┬───────┘   └───────────────┘  │
│         │                   │                               │
│         └───────────────────┘                               │
│                    App Entry Point (app.js)                 │
└─────────────────────────────┬───────────────────────────────┘
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Wikipedia REST API (External)                  │
│                                                             │
│  ┌─────────────────────────┐  ┌──────────────────────────┐  │
│  │  /api/rest_v1           │  │  /w/api.php (MediaWiki)  │  │
│  │  - /page/summary/{title}│  │  - action=query (search) │  │
│  │  - Returns: extract,    │  │  - action=parse (sections)│  │
│  │    thumbnail, url       │  │  - action=query (links)  │  │
│  └─────────────────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Module Breakdown

### WikipediaService (src/app.js)
**Role**: Data fetching layer. All Wikipedia API interactions.

| Method | API Endpoint | Purpose |
|--------|-------------|---------|
| `search(query)` | `/w/api.php?action=query&list=search` | Finds matching article titles |
| `getSummary(title)` | `/api/rest_v1/page/summary/{title}` | Gets article extract + metadata |
| `getRelated(title)` | `/w/api.php?action=query&prop=links` | Fetches linked article titles |
| `getSections(title)` | `/w/api.php?action=parse` | Gets article section structure |
| `research(query)` | (orchestrator) | Combines search + summary + related |

### StorageService (src/app.js)
**Role**: Persistence layer using `localStorage`.

| Method | Key | Purpose |
|--------|-----|---------|
| `getHistory()` | `wiki_history` | Returns search history array |
| `addToHistory(result)` | `wiki_history` | Prepends to history (max 30 items) |
| `saveArticle(result)` | `wiki_saved` | Bookmarks an article |
| `removeFromSaved(title)` | `wiki_saved` | Removes a bookmark |
| `isSaved(title)` | `wiki_saved` | Checks if article is bookmarked |

### UIController (src/app.js)
**Role**: View layer. All DOM operations, rendering, and state management.

| Method | Purpose |
|--------|---------|
| `init()` | Binds DOM elements and event listeners |
| `showLoading(topic)` | Displays animated loading state |
| `showError(msg)` | Shows user-friendly error messages |
| `renderResult(result)` | Renders full research result |
| `renderSections(extract)` | Splits text into collapsible sections |
| `renderHistoryList()` | Renders history tab content |
| `renderSavedList()` | Renders saved articles tab content |
| `updateStats()` | Updates sidebar statistics |

## Data Flow

```
User Input (query string)
    │
    ▼
App.handleSearch()
    │
    ├──▶ WikipediaService.research(query)
    │         │
    │         ├──▶ search(query)     → [title1, title2, ...]
    │         │
    │         ├──▶ getSummary(title) → { title, extract, thumbnail, url }
    │         │
    │         └──▶ getRelated(title) → [related1, related2, ...]
    │
    ├──▶ StorageService.addToHistory(result)
    │
    └──▶ UIController.renderResult(result)

Result Object Shape:
{
  query: string,          // Original user query
  title: string,          // Wikipedia canonical title
  displayTitle: string,   // HTML display title
  extract: string,        // Plain text summary
  thumbnail: string|null, // Image URL if available
  wikiUrl: string,        // Wikipedia page URL
  related: string[],      // Related article titles
  timestamp: string       // ISO 8601 timestamp
}
```

## API Details

### Wikipedia REST API (v1)
- **Base URL**: `https://en.wikipedia.org/api/rest_v1`
- **Authentication**: None required
- **Rate limiting**: Be respectful; no burst limiting for simple usage
- **CORS**: Supported

### MediaWiki API
- **Base URL**: `https://en.wikipedia.org/w/api.php`
- **Authentication**: None required for read operations
- **Required param**: `origin: '*'` for CORS
- **Format**: `format: 'json'`

## Storage Schema

```json
// wiki_history (localStorage)
[
  {
    "title": "Artificial Intelligence",
    "query": "what is AI",
    "wikiUrl": "https://en.wikipedia.org/wiki/...",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
]

// wiki_saved (localStorage)
[
  {
    "title": "Machine Learning",
    "query": "how does ML work",
    "wikiUrl": "https://en.wikipedia.org/wiki/...",
    "extract": "Machine learning is a subset...",
    "timestamp": "2024-01-15T10:32:00.000Z"
  }
]
```
