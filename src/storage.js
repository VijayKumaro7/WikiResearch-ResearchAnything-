/**
 * StorageService — ES module extracted from app.js for testability.
 * Manages localStorage for history and saved articles.
 */

const KEYS = { HISTORY: 'wiki_history', SAVED: 'wiki_saved' };
export const MAX_HISTORY = 30;

export function getHistory() {
  try { return JSON.parse(localStorage.getItem(KEYS.HISTORY) || '[]'); } catch { return []; }
}

export function addToHistory(result) {
  const history = getHistory();
  const filtered = history.filter(h => h.title !== result.title);
  filtered.unshift({ title: result.title, query: result.query, wikiUrl: result.wikiUrl, timestamp: result.timestamp });
  localStorage.setItem(KEYS.HISTORY, JSON.stringify(filtered.slice(0, MAX_HISTORY)));
}

export function clearHistory() {
  localStorage.removeItem(KEYS.HISTORY);
}

export function getSaved() {
  try { return JSON.parse(localStorage.getItem(KEYS.SAVED) || '[]'); } catch { return []; }
}

export function saveArticle(result) {
  const saved = getSaved();
  if (saved.find(s => s.title === result.title)) return false;
  saved.unshift({
    title: result.title,
    query: result.query,
    wikiUrl: result.wikiUrl,
    extract: result.extract?.slice(0, 200),
    timestamp: new Date().toISOString()
  });
  localStorage.setItem(KEYS.SAVED, JSON.stringify(saved));
  return true;
}

export function removeFromSaved(title) {
  const saved = getSaved().filter(s => s.title !== title);
  localStorage.setItem(KEYS.SAVED, JSON.stringify(saved));
}

export function clearSaved() {
  localStorage.removeItem(KEYS.SAVED);
}

export function isSaved(title) {
  return getSaved().some(s => s.title === title);
}

const StorageService = {
  getHistory, addToHistory, clearHistory,
  getSaved, saveArticle, removeFromSaved, clearSaved, isSaved
};

export default StorageService;
