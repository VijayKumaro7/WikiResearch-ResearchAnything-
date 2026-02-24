# Test Plan — Wikipedia Research Assistant

## Overview

This document covers manual testing procedures for the Wikipedia Research Assistant. Since the project is a pure frontend application with no build system, testing is conducted manually in-browser, supplemented by console-based unit tests.

---

## 1. WikipediaService Tests

### Test Suite: `search()`

| Test ID | Description | Input | Expected Output | Pass/Fail |
|---------|-------------|-------|-----------------|-----------|
| WS-01 | Basic search returns results | `"artificial intelligence"` | Array of ≥1 results with `title` field | |
| WS-02 | Search with question phrase | `"how does DNA work?"` | Results about DNA | |
| WS-03 | Search with empty string | `""` | Throws or returns empty array | |
| WS-04 | Search for obscure topic | `"Quetzalcoatl"` | Returns at least 1 result | |
| WS-05 | Search result shape | Any valid query | Objects have: `title`, `snippet`, `pageid` | |

### Test Suite: `getSummary()`

| Test ID | Description | Input | Expected Output | Pass/Fail |
|---------|-------------|-------|-----------------|-----------|
| SUM-01 | Valid title returns summary | `"Python (programming language)"` | Object with `extract`, `title`, `content_urls` | |
| SUM-02 | Invalid title throws 404 | `"XYZABC_NONEXISTENT_12345"` | Throws error with "404" | |
| SUM-03 | Title with spaces | `"machine learning"` | Returns valid summary | |
| SUM-04 | Title with special chars | `"C++ (programming language)"` | Returns valid summary (URL-encoded) | |

### Test Suite: `research()` (integration)

| Test ID | Description | Input | Expected Output | Pass/Fail |
|---------|-------------|-------|-----------------|-----------|
| RES-01 | Full research pipeline | `"quantum computing"` | Object with title, extract, related[], wikiUrl | |
| RES-02 | NO_RESULTS error | `"xkjhsdflkjhsdf23984"` | Throws `Error('NO_RESULTS')` | |
| RES-03 | Result has timestamp | Any valid query | `timestamp` is valid ISO string | |
| RES-04 | Related is array | Any valid query | `related` is `string[]` | |
| RES-05 | wikiUrl is valid | Any valid query | `wikiUrl` starts with `https://en.wikipedia.org` | |

---

## 2. StorageService Tests

Run in browser console after loading the app:

```js
// Test addToHistory
StorageService.addToHistory({ title: "Test Article", query: "test", wikiUrl: "https://...", timestamp: new Date().toISOString() });
console.assert(StorageService.getHistory().length >= 1, "History should have item");

// Test duplicate prevention
const before = StorageService.getHistory().length;
StorageService.addToHistory({ title: "Test Article", query: "test2", wikiUrl: "https://...", timestamp: new Date().toISOString() });
console.assert(StorageService.getHistory().length === before, "No duplicates by title");

// Test saveArticle
const saved = StorageService.saveArticle({ title: "Save Test", query: "save", wikiUrl: "https://...", extract: "..." });
console.assert(saved === true, "First save returns true");
const saved2 = StorageService.saveArticle({ title: "Save Test", query: "save", wikiUrl: "https://..." });
console.assert(saved2 === false, "Duplicate save returns false");

// Test isSaved
console.assert(StorageService.isSaved("Save Test") === true, "isSaved returns true");
console.assert(StorageService.isSaved("NONEXISTENT") === false, "isSaved returns false");

// Test removeFromSaved
StorageService.removeFromSaved("Save Test");
console.assert(StorageService.isSaved("Save Test") === false, "Article removed");

// Test clearHistory
StorageService.clearHistory();
console.assert(StorageService.getHistory().length === 0, "History cleared");

console.log("All StorageService tests passed!");
```

---

## 3. UI Tests (Manual)

### Search Flow

| Test ID | Steps | Expected Result | Pass/Fail |
|---------|-------|-----------------|-----------|
| UI-01 | Load app → see empty state | W logo with circles, example queries visible | |
| UI-02 | Click example query | Input fills, search triggers automatically | |
| UI-03 | Type query → press Enter | Search triggers | |
| UI-04 | Type query → click Search btn | Search triggers | |
| UI-05 | Empty input → click Search | Shows empty state (no API call) | |
| UI-06 | Valid search → see results | Title, summary card, collapsible sections, related chips | |
| UI-07 | Invalid search → see error | Error state with "try again" button | |

### Navigation

| Test ID | Steps | Expected Result | Pass/Fail |
|---------|-------|-----------------|-----------|
| NAV-01 | Click History tab | History panel shows | |
| NAV-02 | Click Saved tab | Saved panel shows | |
| NAV-03 | Switch between tabs | Active nav button highlights | |
| NAV-04 | After search → history tab | Search appears in history list | |

### Saving Articles

| Test ID | Steps | Expected Result | Pass/Fail |
|---------|-------|-----------------|-----------|
| SAVE-01 | Search → click Save | Button changes to "Saved" style | |
| SAVE-02 | Check Saved tab | Article appears in saved list | |
| SAVE-03 | Save same article again | Button stays "Saved", no duplicate | |
| SAVE-04 | Remove from Saved tab | Article disappears from list | |
| SAVE-05 | Clear All saved | Empty state shown | |

### Quick Topics & Related

| Test ID | Steps | Expected Result | Pass/Fail |
|---------|-------|-----------------|-----------|
| QT-01 | Click sidebar chip | Triggers search for that topic | |
| QT-02 | Click related chip in results | Triggers new search | |
| QT-03 | Click history item | Triggers new search | |

### Stats

| Test ID | Steps | Expected Result | Pass/Fail |
|---------|-------|-----------------|-----------|
| STAT-01 | Initial load | All stats show 0 | |
| STAT-02 | After search | Queries stat increments | |
| STAT-03 | After save | Saved stat increments | |
| STAT-04 | After clear history | Stats update | |

---

## 4. Responsive Design Tests

| Viewport | Test | Expected |
|----------|------|----------|
| 1440px | Full layout | Sidebar + main content side by side |
| 900px | Medium screen | Sidebar narrows to 220px |
| 640px | Mobile | Sidebar collapses to top bar |
| 375px | Small mobile | Single column, search still works |

---

## 5. Network Tests

| Scenario | Expected Behavior |
|----------|------------------|
| Normal connection | Results load within 2-3 seconds |
| Slow connection | Loading spinner displays until complete |
| No connection | Error state with network error message |
| Wikipedia API down | Error state with appropriate message |

---

## 6. Edge Cases

| Test | Input | Expected |
|------|-------|----------|
| Unicode query | `"中文 Wikipedia"` | Handles gracefully |
| Very long query | 500+ character string | Truncates or handles without crash |
| Special chars | `"C++ & Java?"` | URL-encodes properly |
| Numbers only | `"1066"` | Returns year/date related articles |
| Single letter | `"A"` | Returns some results |
| XSS attempt | `<script>alert(1)</script>` | Not executed, treated as literal |

---

## Automated Test Runner (Console)

Paste into browser console for a quick smoke test:

```js
(async () => {
  console.group('WikiResearch Smoke Tests');
  
  try {
    // Test 1: Search
    const results = await WikipediaService.search('machine learning');
    console.assert(results.length > 0, '❌ Search returned no results');
    console.log('✅ search() works');

    // Test 2: Research
    const result = await WikipediaService.research('Python programming');
    console.assert(result.title, '❌ No title in result');
    console.assert(result.extract, '❌ No extract in result');
    console.assert(result.wikiUrl, '❌ No wikiUrl in result');
    console.assert(Array.isArray(result.related), '❌ Related is not array');
    console.log('✅ research() works:', result.title);

    // Test 3: NO_RESULTS error
    try {
      await WikipediaService.research('xkcd_nonexistent_12345_abc');
      console.warn('⚠️  Expected NO_RESULTS error not thrown');
    } catch (e) {
      if (e.message === 'NO_RESULTS') console.log('✅ NO_RESULTS error thrown correctly');
    }

    // Test 4: Storage
    StorageService.clearHistory();
    StorageService.addToHistory(result);
    console.assert(StorageService.getHistory().length === 1, '❌ History not saved');
    console.log('✅ StorageService.addToHistory() works');

    console.log('\n🎉 All smoke tests passed!');
  } catch (err) {
    console.error('❌ Smoke test failed:', err);
  }

  console.groupEnd();
})();
```
