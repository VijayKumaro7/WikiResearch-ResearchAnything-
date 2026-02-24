/**
 * WikiResearch — Main Application
 * Wikipedia Research Assistant
 * 
 * Architecture:
 *  - WikipediaService  : Handles all API calls to Wikipedia REST API
 *  - StorageService    : Manages localStorage for history & saved articles
 *  - UIController      : Controls DOM updates, rendering, tab switching
 *  - App               : Entry point, wires everything together
 */

/* ============================================================
   WIKIPEDIA SERVICE
   Handles fetching from Wikipedia's REST API (no API key needed)
   ============================================================ */
const WikipediaService = (() => {
  const BASE = 'https://en.wikipedia.org/api/rest_v1';
  const SEARCH_BASE = 'https://en.wikipedia.org/w/api.php';

  /**
   * Search for Wikipedia articles matching a query
   * @param {string} query
   * @returns {Promise<Array>} Array of search result objects
   */
  async function search(query) {
    const params = new URLSearchParams({
      action: 'query',
      list: 'search',
      srsearch: query,
      srlimit: 5,
      format: 'json',
      origin: '*'
    });
    let res;
    try {
      res = await fetch(`${SEARCH_BASE}?${params}`);
    } catch (err) {
      // fetch() itself threw — network unreachable, CORS on file://, etc.
      throw new TypeError('NETWORK_ERROR');
    }
    if (!res.ok) throw new Error(`Search failed: ${res.status}`);
    const data = await res.json();
    return data.query?.search || [];
  }

  /**
   * Fetch full article summary from Wikipedia
   * Follows redirects automatically via the REST API.
   * Falls back to MediaWiki extracts API if REST summary fails.
   * @param {string} title - Exact Wikipedia page title
   * @returns {Promise<Object>} Summary object with extract, etc.
   */
  async function getSummary(title) {
    const encoded = encodeURIComponent(title.replace(/ /g, '_'));

    // Primary: REST v1 summary (fast, structured)
    try {
      const res = await fetch(`${BASE}/page/summary/${encoded}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        // REST API may return a disambiguation or redirect page with no extract
        if (data.extract && data.extract.trim().length > 0) return data;
      }
    } catch (_) { /* fall through to backup */ }

    // Fallback: MediaWiki extracts API
    const params = new URLSearchParams({
      action: 'query',
      titles: title,
      prop: 'extracts|info',
      exintro: true,
      explaintext: true,
      inprop: 'url',
      redirects: 1,
      format: 'json',
      origin: '*'
    });
    const res = await fetch(`${SEARCH_BASE}?${params}`);
    if (!res.ok) throw new Error(`Article not found: ${res.status}`);
    const data = await res.json();
    const pages = Object.values(data.query?.pages || {});
    const page = pages[0];
    if (!page || page.missing !== undefined) throw new Error('Article not found: 404');

    // Normalize to match REST API shape
    return {
      title: page.title,
      displaytitle: page.title,
      extract: page.extract || '',
      thumbnail: null,
      content_urls: {
        desktop: { page: page.fullurl || `https://en.wikipedia.org/wiki/${encoded}` }
      }
    };
  }

  /**
   * Fetch related pages for a given title
   * @param {string} title
   * @returns {Promise<Array>} Array of related page titles
   */
  async function getRelated(title) {
    const params = new URLSearchParams({
      action: 'query',
      titles: title,
      prop: 'links',
      pllimit: 15,
      plnamespace: 0,
      format: 'json',
      origin: '*'
    });
    const res = await fetch(`${SEARCH_BASE}?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    const pages = Object.values(data.query?.pages || {});
    return pages[0]?.links?.map(l => l.title) || [];
  }

  /**
   * Fetch full article sections/content
   * @param {string} title
   * @returns {Promise<Object>} Sections data
   */
  async function getSections(title) {
    const params = new URLSearchParams({
      action: 'parse',
      page: title,
      prop: 'sections|text',
      format: 'json',
      origin: '*',
      disableeditsection: true,
      disabletoc: true
    });
    const res = await fetch(`${SEARCH_BASE}?${params}`);
    if (!res.ok) return { sections: [] };
    const data = await res.json();
    return data.parse || { sections: [] };
  }

  /**
   * Main research function: orchestrates search + summary + related
   * Retries with alternate results if the top hit fails.
   * @param {string} query - User's question or topic
   * @returns {Promise<Object>} Full research result
   */
  async function research(query) {
    // Step 1: Search for matching articles
    let results;
    try {
      results = await search(query);
    } catch (err) {
      // Distinguish network failure from API error
      if (err instanceof TypeError) throw new Error('NETWORK_ERROR');
      throw err;
    }

    if (!results || results.length === 0) throw new Error('NO_RESULTS');

    // Step 2: Try each result until one succeeds (handles redirects & missing pages)
    let summary = null;
    let usedTitle = null;
    let usedSnippet = '';

    for (let i = 0; i < Math.min(results.length, 3); i++) {
      const candidate = results[i];
      try {
        summary = await getSummary(candidate.title);
        usedTitle = candidate.title;
        usedSnippet = candidate.snippet || '';
        // Ensure we got a usable extract
        if (summary.extract && summary.extract.trim().length > 30) break;
      } catch (_) {
        // Try next result
      }
    }

    // If all failed, use the snippet text from search as the extract
    if (!summary || !summary.extract || summary.extract.trim().length === 0) {
      const best = results[0];
      summary = {
        title: best.title,
        displaytitle: best.title,
        extract: stripHTML(best.snippet) || 'No summary available for this article.',
        thumbnail: null,
        content_urls: {
          desktop: { page: `https://en.wikipedia.org/wiki/${encodeURIComponent(best.title.replace(/ /g, '_'))}` }
        }
      };
      usedTitle = best.title;
    }

    // Step 3: Fetch related (non-blocking, failure is OK)
    let related = [];
    try {
      related = await getRelated(usedTitle || results[0].title);
    } catch (_) { /* related is optional */ }

    return {
      query,
      title: summary.title || usedTitle,
      displayTitle: summary.displaytitle || summary.title || usedTitle,
      extract: summary.extract || stripHTML(usedSnippet),
      thumbnail: summary.thumbnail?.source || null,
      wikiUrl: summary.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent((usedTitle || '').replace(/ /g, '_'))}`,
      related: related.slice(0, 10),
      timestamp: new Date().toISOString()
    };
  }

  function stripHTML(html) {
    const d = document.createElement('div');
    d.innerHTML = html;
    return d.textContent || d.innerText || '';
  }

  return { research, getSections };
})();


/* ============================================================
   STORAGE SERVICE
   Manages localStorage for history and saved articles
   ============================================================ */
const StorageService = (() => {
  const KEYS = { HISTORY: 'wiki_history', SAVED: 'wiki_saved' };
  const MAX_HISTORY = 30;

  function getHistory() {
    try { return JSON.parse(localStorage.getItem(KEYS.HISTORY) || '[]'); } catch { return []; }
  }

  function addToHistory(result) {
    const history = getHistory();
    // Remove duplicate
    const filtered = history.filter(h => h.title !== result.title);
    filtered.unshift({ title: result.title, query: result.query, wikiUrl: result.wikiUrl, timestamp: result.timestamp });
    localStorage.setItem(KEYS.HISTORY, JSON.stringify(filtered.slice(0, MAX_HISTORY)));
  }

  function clearHistory() {
    localStorage.removeItem(KEYS.HISTORY);
  }

  function getSaved() {
    try { return JSON.parse(localStorage.getItem(KEYS.SAVED) || '[]'); } catch { return []; }
  }

  function saveArticle(result) {
    const saved = getSaved();
    if (saved.find(s => s.title === result.title)) return false;
    saved.unshift({ title: result.title, query: result.query, wikiUrl: result.wikiUrl, extract: result.extract?.slice(0, 200), timestamp: new Date().toISOString() });
    localStorage.setItem(KEYS.SAVED, JSON.stringify(saved));
    return true;
  }

  function removeFromSaved(title) {
    const saved = getSaved().filter(s => s.title !== title);
    localStorage.setItem(KEYS.SAVED, JSON.stringify(saved));
  }

  function clearSaved() {
    localStorage.removeItem(KEYS.SAVED);
  }

  function isSaved(title) {
    return getSaved().some(s => s.title === title);
  }

  return { getHistory, addToHistory, clearHistory, getSaved, saveArticle, removeFromSaved, clearSaved, isSaved };
})();


/* ============================================================
   UI CONTROLLER
   Controls all DOM interactions and rendering
   ============================================================ */
const UIController = (() => {

  // DOM refs
  const els = {};
  let currentResult = null;

  function init() {
    els.mainSearch = document.getElementById('main-search');
    els.searchBtn = document.getElementById('search-btn');
    els.loadingState = document.getElementById('loading-state');
    els.loadingTopic = document.getElementById('loading-topic');
    els.errorState = document.getElementById('error-state');
    els.errorMsg = document.getElementById('error-msg');
    els.resultsArea = document.getElementById('results-area');
    els.emptyState = document.getElementById('empty-state');
    els.resultsTitle = document.getElementById('results-title');
    els.summaryText = document.getElementById('summary-text');
    els.sectionsArea = document.getElementById('sections-area');
    els.relatedArea = document.getElementById('related-area');
    els.wikiLink = document.getElementById('wiki-link');
    els.saveBtn = document.getElementById('save-btn');
    els.historyList = document.getElementById('history-list');
    els.savedList = document.getElementById('saved-list');
    els.statQueries = document.getElementById('stat-queries');
    els.statSaved = document.getElementById('stat-saved');
    els.statTopics = document.getElementById('stat-topics');

    // Key events
    els.mainSearch.addEventListener('keydown', e => {
      if (e.key === 'Enter') handleSearch();
    });

    updateStats();
  }

  function showState(state) {
    ['loading-state', 'error-state', 'results-area', 'empty-state'].forEach(id => {
      document.getElementById(id).classList.add('hidden');
    });
    if (state) document.getElementById(state).classList.remove('hidden');
  }

  function showLoading(topic) {
    els.loadingTopic.textContent = topic ? `Searching for: "${topic}"` : '';
    showState('loading-state');
    els.searchBtn.disabled = true;
  }

  function showError(msg) {
    els.errorMsg.textContent = msg || 'Try a different search term.';
    showState('error-state');
    els.searchBtn.disabled = false;
  }

  function showEmpty() {
    showState('empty-state');
    els.searchBtn.disabled = false;
  }

  function renderResult(result) {
    currentResult = result;

    // Header
    els.resultsTitle.innerHTML = result.displayTitle || result.title;
    els.wikiLink.href = result.wikiUrl;

    // Update save button state
    const saved = StorageService.isSaved(result.title);
    els.saveBtn.classList.toggle('saved', saved);
    els.saveBtn.innerHTML = saved
      ? `<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg> Saved`
      : `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg> Save`;

    // Summary
    els.summaryText.textContent = result.extract || 'No summary available.';

    // Sections — render intelligently split paragraphs
    renderSections(result.extract);

    // Related
    renderRelated(result.related);

    showState('results-area');
    els.searchBtn.disabled = false;
  }

  function renderSections(extract) {
    if (!extract) { els.sectionsArea.innerHTML = ''; return; }

    // Split extract into sentences and group into logical "sections"
    const sentences = extract.match(/[^.!?]+[.!?]+/g) || [extract];
    const chunkSize = Math.ceil(sentences.length / Math.min(3, Math.ceil(sentences.length / 5)));
    const chunks = [];
    for (let i = 0; i < sentences.length; i += chunkSize) {
      chunks.push(sentences.slice(i, i + chunkSize).join(' ').trim());
    }

    const labels = ['Overview', 'Background', 'Key Details', 'Further Context'];

    if (chunks.length <= 1) { els.sectionsArea.innerHTML = ''; return; }

    els.sectionsArea.innerHTML = chunks.map((chunk, i) => `
      <div class="section-card">
        <button class="section-toggle" onclick="UIController.toggleSection(this)">
          <span class="section-toggle-title">${labels[i] || `Section ${i + 1}`}</span>
          <span class="section-toggle-icon">+</span>
        </button>
        <div class="section-body">
          <p>${chunk}</p>
        </div>
      </div>
    `).join('');
  }

  function toggleSection(btn) {
    const body = btn.nextElementSibling;
    const icon = btn.querySelector('.section-toggle-icon');
    const isOpen = body.classList.toggle('open');
    icon.textContent = isOpen ? '−' : '+';
  }

  function renderRelated(related) {
    if (!related?.length) { els.relatedArea.innerHTML = ''; return; }
    els.relatedArea.innerHTML = `
      <p class="related-title">Related Topics</p>
      <div class="related-chips">
        ${related.map(t => `<button class="related-chip" onclick="quickSearch('${t.replace(/'/g, "\\'")}')">${t}</button>`).join('')}
      </div>
    `;
  }

  function renderHistoryList() {
    const history = StorageService.getHistory();
    if (!history.length) {
      els.historyList.innerHTML = '<div class="empty-list">No searches yet. Start researching!</div>';
      return;
    }
    els.historyList.innerHTML = history.map(h => `
      <div class="list-card" onclick="quickSearch('${h.title.replace(/'/g, "\\'")}')">
        <div class="list-card-left">
          <div class="list-card-title">${h.title}</div>
          <div class="list-card-sub">${formatDate(h.timestamp)} · Query: "${h.query}"</div>
        </div>
        <button class="list-card-btn" onclick="event.stopPropagation(); quickSearch('${h.title.replace(/'/g, "\\'")}')">Search Again</button>
      </div>
    `).join('');
  }

  function renderSavedList() {
    const saved = StorageService.getSaved();
    if (!saved.length) {
      els.savedList.innerHTML = '<div class="empty-list">No saved articles yet.</div>';
      return;
    }
    els.savedList.innerHTML = saved.map(s => `
      <div class="list-card">
        <div class="list-card-left" onclick="quickSearch('${s.title.replace(/'/g, "\\'")}')">
          <div class="list-card-title">${s.title}</div>
          <div class="list-card-sub">${formatDate(s.timestamp)}${s.extract ? ` · ${s.extract}…` : ''}</div>
        </div>
        <button class="list-card-btn del-btn" onclick="event.stopPropagation(); removeSaved('${s.title.replace(/'/g, "\\'")}')">Remove</button>
      </div>
    `).join('');
  }

  function updateStats() {
    const history = StorageService.getHistory();
    const saved = StorageService.getSaved();
    const topics = new Set(history.map(h => h.title.split(':')[0].trim())).size;
    if (els.statQueries) els.statQueries.textContent = history.length;
    if (els.statSaved) els.statSaved.textContent = saved.length;
    if (els.statTopics) els.statTopics.textContent = topics;
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function getSearchQuery() {
    return els.mainSearch?.value?.trim() || '';
  }

  function setSearchQuery(q) {
    if (els.mainSearch) els.mainSearch.value = q;
  }

  function getCurrentResult() { return currentResult; }

  return {
    init, showLoading, showError, showEmpty,
    renderResult, renderHistoryList, renderSavedList,
    updateStats, getSearchQuery, setSearchQuery, getCurrentResult,
    toggleSection
  };
})();


/* ============================================================
   APP ENTRY POINT
   Wires everything together
   ============================================================ */
let currentTab = 'search';

async function handleSearch() {
  const query = UIController.getSearchQuery();
  if (!query) {
    UIController.showEmpty();
    return;
  }

  UIController.showLoading(query);

  try {
    const result = await WikipediaService.research(query);
    StorageService.addToHistory(result);
    UIController.renderResult(result);
    UIController.updateStats();
  } catch (err) {
    console.error('Research error:', err);

    if (err.message === 'NO_RESULTS') {
      UIController.showError(`No Wikipedia articles found for "${query}". Try rephrasing or use a broader term.`);
    } else if (err.message === 'NETWORK_ERROR' || err instanceof TypeError) {
      // TypeError = fetch() itself failed (no network, DNS, CORS on file://, etc.)
      UIController.showError(
        'Could not reach Wikipedia. This usually happens when opening the app via file:// — ' +
        'try running it through a local server (e.g. python -m http.server 3000).'
      );
    } else if (err.message && err.message.includes('404')) {
      UIController.showError(`The article could not be loaded. Try a different search term.`);
    } else {
      UIController.showError(`Something went wrong: ${err.message || 'Unknown error'}. Please try again.`);
    }
  }
}

function quickSearch(term) {
  switchTab('search');
  UIController.setSearchQuery(term);
  handleSearch();
}

function fillSearch(query) {
  UIController.setSearchQuery(query);
  document.getElementById('main-search').focus();
}

function clearResults() {
  UIController.setSearchQuery('');
  UIController.showEmpty();
}

function saveCurrentResult() {
  const result = UIController.getCurrentResult();
  if (!result) return;
  const saved = StorageService.saveArticle(result);
  if (saved) {
    UIController.renderResult(result); // re-render to update save btn
    UIController.updateStats();
  }
}

function removeSaved(title) {
  StorageService.removeFromSaved(title);
  UIController.renderSavedList();
  UIController.updateStats();
}

function clearHistory() {
  if (confirm('Clear all search history?')) {
    StorageService.clearHistory();
    UIController.renderHistoryList();
    UIController.updateStats();
  }
}

function clearSaved() {
  if (confirm('Clear all saved articles?')) {
    StorageService.clearSaved();
    UIController.renderSavedList();
    UIController.updateStats();
  }
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  document.getElementById(`btn-${tab}`).classList.add('active');

  if (tab === 'history') UIController.renderHistoryList();
  if (tab === 'saved') UIController.renderSavedList();
}

// Expose UIController for inline onclick
window.UIController = UIController;

// Boot
document.addEventListener('DOMContentLoaded', () => {
  UIController.init();
  UIController.showEmpty();
});
