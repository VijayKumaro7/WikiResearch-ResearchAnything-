import { describe, it, expect, beforeEach } from 'vitest';
import {
  getHistory, addToHistory, clearHistory,
  getSaved, saveArticle, removeFromSaved, clearSaved, isSaved,
  MAX_HISTORY
} from '../src/storage.js';

// jsdom provides localStorage automatically; reset between tests
beforeEach(() => {
  localStorage.clear();
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeResult(title, query = 'test') {
  return { title, query, wikiUrl: `https://en.wikipedia.org/wiki/${title}`, timestamp: new Date().toISOString() };
}

// ─── getHistory ─────────────────────────────────────────────────────────────

describe('getHistory', () => {
  it('returns empty array when localStorage is empty', () => {
    expect(getHistory()).toEqual([]);
  });

  it('returns empty array when localStorage value is corrupted JSON', () => {
    localStorage.setItem('wiki_history', 'NOT_VALID_JSON{{{');
    expect(getHistory()).toEqual([]);
  });

  it('returns stored items', () => {
    const item = makeResult('Python');
    addToHistory(item);
    expect(getHistory()).toHaveLength(1);
    expect(getHistory()[0].title).toBe('Python');
  });
});

// ─── addToHistory ────────────────────────────────────────────────────────────

describe('addToHistory', () => {
  it('adds a new item to the front of history', () => {
    addToHistory(makeResult('A'));
    addToHistory(makeResult('B'));
    const h = getHistory();
    expect(h[0].title).toBe('B');
    expect(h[1].title).toBe('A');
  });

  it('deduplicates by title — moves existing item to front', () => {
    addToHistory(makeResult('Python', 'python lang'));
    addToHistory(makeResult('Java'));
    addToHistory(makeResult('Python', 'python 3'));  // duplicate title
    const h = getHistory();
    expect(h[0].title).toBe('Python');
    expect(h[1].title).toBe('Java');
    expect(h).toHaveLength(2);   // no second Python entry
  });

  it('stores query, wikiUrl, timestamp', () => {
    const item = makeResult('Rust', 'rust language');
    addToHistory(item);
    const stored = getHistory()[0];
    expect(stored.query).toBe('rust language');
    expect(stored.wikiUrl).toContain('Rust');
    expect(typeof stored.timestamp).toBe('string');
  });

  it(`caps history at MAX_HISTORY (${MAX_HISTORY}) items`, () => {
    for (let i = 0; i < MAX_HISTORY + 5; i++) {
      addToHistory(makeResult(`Article_${i}`));
    }
    expect(getHistory()).toHaveLength(MAX_HISTORY);
  });

  it('keeps the most recent items when cap is hit', () => {
    for (let i = 0; i < MAX_HISTORY + 3; i++) {
      addToHistory(makeResult(`Article_${i}`));
    }
    const h = getHistory();
    // The last inserted item should be first
    expect(h[0].title).toBe(`Article_${MAX_HISTORY + 2}`);
    // The very first inserted item should have been dropped
    expect(h.find(x => x.title === 'Article_0')).toBeUndefined();
  });
});

// ─── clearHistory ─────────────────────────────────────────────────────────

describe('clearHistory', () => {
  it('empties the history', () => {
    addToHistory(makeResult('Go'));
    clearHistory();
    expect(getHistory()).toEqual([]);
  });

  it('is idempotent on empty storage', () => {
    clearHistory();
    expect(getHistory()).toEqual([]);
  });
});

// ─── getSaved ────────────────────────────────────────────────────────────────

describe('getSaved', () => {
  it('returns empty array when nothing saved', () => {
    expect(getSaved()).toEqual([]);
  });

  it('returns empty array when localStorage value is corrupted JSON', () => {
    localStorage.setItem('wiki_saved', '<<<BAD>>>');
    expect(getSaved()).toEqual([]);
  });
});

// ─── saveArticle ─────────────────────────────────────────────────────────────

describe('saveArticle', () => {
  it('returns true on first save', () => {
    expect(saveArticle(makeResult('TypeScript'))).toBe(true);
  });

  it('returns false when same title is saved again', () => {
    saveArticle(makeResult('TypeScript'));
    expect(saveArticle(makeResult('TypeScript'))).toBe(false);
  });

  it('does not create duplicate entries', () => {
    saveArticle(makeResult('TypeScript'));
    saveArticle(makeResult('TypeScript'));
    expect(getSaved()).toHaveLength(1);
  });

  it('truncates extract to 200 characters', () => {
    const longExtract = 'x'.repeat(500);
    saveArticle({ ...makeResult('LongArticle'), extract: longExtract });
    expect(getSaved()[0].extract).toHaveLength(200);
  });

  it('handles missing extract gracefully', () => {
    const result = makeResult('NoExtract');
    delete result.extract;
    expect(() => saveArticle(result)).not.toThrow();
    expect(getSaved()[0].extract).toBeUndefined();
  });

  it('saves multiple different articles', () => {
    saveArticle(makeResult('A'));
    saveArticle(makeResult('B'));
    saveArticle(makeResult('C'));
    expect(getSaved()).toHaveLength(3);
  });

  it('prepends new articles (most recent first)', () => {
    saveArticle(makeResult('First'));
    saveArticle(makeResult('Second'));
    expect(getSaved()[0].title).toBe('Second');
  });

  it('stores a fresh timestamp on save', () => {
    const before = Date.now();
    saveArticle(makeResult('TimestampTest'));
    const after = Date.now();
    const saved = getSaved()[0];
    const ts = new Date(saved.timestamp).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});

// ─── isSaved ─────────────────────────────────────────────────────────────────

describe('isSaved', () => {
  it('returns true for a saved article', () => {
    saveArticle(makeResult('Saved'));
    expect(isSaved('Saved')).toBe(true);
  });

  it('returns false for an unsaved article', () => {
    expect(isSaved('Never Saved')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isSaved('')).toBe(false);
  });

  it('is case-sensitive', () => {
    saveArticle(makeResult('Python'));
    expect(isSaved('python')).toBe(false);
    expect(isSaved('PYTHON')).toBe(false);
  });
});

// ─── removeFromSaved ──────────────────────────────────────────────────────────

describe('removeFromSaved', () => {
  it('removes a saved article', () => {
    saveArticle(makeResult('ToRemove'));
    removeFromSaved('ToRemove');
    expect(isSaved('ToRemove')).toBe(false);
  });

  it('is a no-op when title does not exist', () => {
    saveArticle(makeResult('Keep'));
    expect(() => removeFromSaved('NonExistent')).not.toThrow();
    expect(getSaved()).toHaveLength(1);
  });

  it('only removes the matching article', () => {
    saveArticle(makeResult('A'));
    saveArticle(makeResult('B'));
    saveArticle(makeResult('C'));
    removeFromSaved('B');
    const titles = getSaved().map(s => s.title);
    expect(titles).not.toContain('B');
    expect(titles).toContain('A');
    expect(titles).toContain('C');
  });
});

// ─── clearSaved ───────────────────────────────────────────────────────────────

describe('clearSaved', () => {
  it('empties all saved articles', () => {
    saveArticle(makeResult('X'));
    saveArticle(makeResult('Y'));
    clearSaved();
    expect(getSaved()).toEqual([]);
  });

  it('is idempotent on empty storage', () => {
    clearSaved();
    expect(getSaved()).toEqual([]);
  });
});
