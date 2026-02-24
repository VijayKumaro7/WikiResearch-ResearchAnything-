# API Reference

## WikipediaService

All methods return Promises and throw on failure.

---

### `WikipediaService.research(query)`

Main entry point. Orchestrates a full research pipeline.

**Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `query` | `string` | User's question or topic (e.g., `"What is photosynthesis?"`) |

**Returns:** `Promise<ResearchResult>`

```js
const result = await WikipediaService.research('What is machine learning?');
// {
//   query: "What is machine learning?",
//   title: "Machine learning",
//   displayTitle: "Machine learning",
//   extract: "Machine learning (ML) is a field of study...",
//   thumbnail: "https://upload.wikimedia.org/...",
//   wikiUrl: "https://en.wikipedia.org/wiki/Machine_learning",
//   related: ["Deep learning", "Neural network", ...],
//   timestamp: "2024-01-15T10:30:00.000Z"
// }
```

**Throws:**
- `Error('NO_RESULTS')` if no Wikipedia articles match the query
- `TypeError` if network request fails
- `Error('Article not found: 404')` if title can't be fetched

---

### `WikipediaService.search(query)`

Finds Wikipedia articles matching a search query.

**Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `query` | `string` | Search string |

**Returns:** `Promise<SearchResult[]>`

```js
const results = await WikipediaService.search('quantum computing');
// [
//   { title: "Quantum computing", snippet: "Quantum computing is...", ... },
//   { title: "Quantum supremacy", snippet: "...", ... }
// ]
```

**Wikipedia API used:**
```
GET /w/api.php?action=query&list=search&srsearch={query}&srlimit=5&format=json&origin=*
```

---

### `WikipediaService.getSummary(title)`

Fetches a full article summary from Wikipedia's REST API.

**Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `title` | `string` | Exact Wikipedia page title |

**Returns:** `Promise<WikiSummary>`

```js
const summary = await WikipediaService.getSummary('Quantum computing');
// {
//   title: "Quantum computing",
//   displaytitle: "Quantum computing",
//   extract: "Quantum computing is a type of computation...",
//   thumbnail: { source: "https://...", width: 320, height: 240 },
//   content_urls: {
//     desktop: { page: "https://en.wikipedia.org/wiki/Quantum_computing" }
//   }
// }
```

**Wikipedia API used:**
```
GET /api/rest_v1/page/summary/{title}
```

---

### `WikipediaService.getRelated(title)`

Fetches titles of articles linked from a given Wikipedia article.

**Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `title` | `string` | Wikipedia page title |

**Returns:** `Promise<string[]>` — Array of related article titles (up to 10)

```js
const related = await WikipediaService.getRelated('Quantum computing');
// ["Qubit", "Quantum entanglement", "Superposition", ...]
```

---

## StorageService

Synchronous localStorage wrapper. No Promises.

---

### `StorageService.getHistory()`
Returns search history array (newest first, max 30).

**Returns:** `HistoryItem[]`

---

### `StorageService.addToHistory(result)`
Prepends a result to history. Removes duplicate titles.

**Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `result` | `ResearchResult` | Result from `WikipediaService.research()` |

---

### `StorageService.clearHistory()`
Removes all history from localStorage.

---

### `StorageService.getSaved()`
Returns all saved articles (newest first).

**Returns:** `SavedItem[]`

---

### `StorageService.saveArticle(result)`
Saves an article. Skips if already saved.

**Returns:** `boolean` — `true` if saved, `false` if already exists

---

### `StorageService.removeFromSaved(title)`
Removes an article from saved by title.

---

### `StorageService.clearSaved()`
Removes all saved articles.

---

### `StorageService.isSaved(title)`
Checks if a given article title is saved.

**Returns:** `boolean`

---

## UIController

Controls all DOM rendering and user interactions.

---

### `UIController.init()`
Binds all DOM elements and event listeners. Must be called on `DOMContentLoaded`.

---

### `UIController.showLoading(topic)`
Shows the loading spinner state.

| Param | Type | Description |
|-------|------|-------------|
| `topic` | `string` | Optional label shown under spinner |

---

### `UIController.showError(msg)`
Shows the error state with a custom message.

---

### `UIController.showEmpty()`
Shows the initial empty/welcome state.

---

### `UIController.renderResult(result)`
Renders a full research result into the results area.

| Param | Type | Description |
|-------|------|-------------|
| `result` | `ResearchResult` | From `WikipediaService.research()` |

---

### `UIController.renderHistoryList()`
Re-renders the history tab list from localStorage.

---

### `UIController.renderSavedList()`
Re-renders the saved articles tab list from localStorage.

---

### `UIController.updateStats()`
Updates the sidebar statistics (queries, saved, topics).

---

## Global Functions

These are bound to `window` for use in inline HTML event handlers.

| Function | Description |
|----------|-------------|
| `handleSearch()` | Triggers search from current input value |
| `quickSearch(term)` | Sets input to `term` and triggers search |
| `fillSearch(query)` | Sets input to `query` without searching |
| `clearResults()` | Clears input and shows empty state |
| `saveCurrentResult()` | Saves the currently displayed result |
| `removeSaved(title)` | Removes an article from saved |
| `clearHistory()` | Clears all history (with confirmation) |
| `clearSaved()` | Clears all saved (with confirmation) |
| `switchTab(tab)` | Switches between 'search', 'history', 'saved' |

---

## Error Codes

| Code | Meaning | Suggested Action |
|------|---------|-----------------|
| `NO_RESULTS` | Query returned 0 Wikipedia matches | Show "try different term" UI |
| `404` (via fetch) | Article not found after search | Fall back to snippet text |
| Network error | `fetch()` threw `TypeError` | Show connectivity error |
