/**
 * Integration tests — exercise StorageService and WikipediaService together,
 * simulating the full data flows that handleSearch / saveCurrentResult /
 * removeSaved orchestrate in the real app.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getHistory, addToHistory, clearHistory,
  getSaved, saveArticle, removeFromSaved, clearSaved, isSaved
} from '../src/storage.js';
import { research } from '../src/wikipedia.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockFetch(searchTitles, summaryTitle, summaryExtract = 'A detailed extract about the topic that is long enough.') {
  const searchResp = {
    query: {
      search: searchTitles.map((t, i) => ({
        title: t, pageid: i + 1, snippet: `<b>${t}</b> snippet.`,
      })),
    },
  };
  const summaryResp = {
    title: summaryTitle,
    displaytitle: summaryTitle,
    extract: summaryExtract,
    thumbnail: null,
    content_urls: { desktop: { page: `https://en.wikipedia.org/wiki/${summaryTitle}` } },
  };
  const relatedResp = {
    query: { pages: { '1': { links: [{ title: 'Related A' }, { title: 'Related B' }] } } },
  };

  const makeRes = body => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
  vi.stubGlobal('fetch', vi.fn()
    .mockReturnValueOnce(makeRes(searchResp))
    .mockReturnValueOnce(makeRes(summaryResp))
    .mockReturnValueOnce(makeRes(relatedResp))
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Search → History ─────────────────────────────────────────────────────────

describe('search result is added to history', () => {
  it('research result can be stored and retrieved from history', async () => {
    mockFetch(['Python'], 'Python');
    const result = await research('Python programming');
    addToHistory(result);

    const history = getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].title).toBe('Python');
    expect(history[0].query).toBe('Python programming');
    expect(history[0].wikiUrl).toContain('wikipedia.org');
  });

  it('second search for same topic replaces old history entry (dedup)', async () => {
    mockFetch(['Python'], 'Python');
    const r1 = await research('Python lang');
    addToHistory(r1);

    // Re-stub for second search
    mockFetch(['Python'], 'Python', 'Updated extract about Python.');
    const r2 = await research('Python 3');
    addToHistory(r2);

    const history = getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].query).toBe('Python 3');  // most recent wins
  });

  it('searches for different topics accumulate in history', async () => {
    mockFetch(['Python'], 'Python');
    addToHistory(await research('Python'));

    mockFetch(['JavaScript'], 'JavaScript');
    addToHistory(await research('JavaScript'));

    mockFetch(['Rust'], 'Rust');
    addToHistory(await research('Rust'));

    expect(getHistory()).toHaveLength(3);
  });

  it('history entries include timestamp', async () => {
    mockFetch(['Python'], 'Python');
    const result = await research('Python');
    addToHistory(result);
    const entry = getHistory()[0];
    expect(typeof entry.timestamp).toBe('string');
    expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
  });
});

// ─── Search → Save → Verify ───────────────────────────────────────────────────

describe('full save flow', () => {
  it('save and verify article is in saved list', async () => {
    mockFetch(['Python'], 'Python');
    const result = await research('Python');
    const saved = saveArticle(result);

    expect(saved).toBe(true);
    expect(isSaved('Python')).toBe(true);
    expect(getSaved()).toHaveLength(1);
    expect(getSaved()[0].title).toBe('Python');
  });

  it('saving same article twice returns false and no duplicate', async () => {
    mockFetch(['Python'], 'Python');
    const result = await research('Python');

    expect(saveArticle(result)).toBe(true);
    expect(saveArticle(result)).toBe(false);
    expect(getSaved()).toHaveLength(1);
  });

  it('saves extract truncated to 200 chars', async () => {
    const longExtract = 'Word '.repeat(100);
    mockFetch(['Verbose'], 'Verbose', longExtract);
    const result = await research('verbose article');
    saveArticle(result);

    const stored = getSaved()[0];
    expect(stored.extract.length).toBeLessThanOrEqual(200);
  });
});

// ─── Save → Remove → Verify ───────────────────────────────────────────────────

describe('remove from saved', () => {
  it('remove an article and verify it is gone', async () => {
    mockFetch(['Python'], 'Python');
    const result = await research('Python');
    saveArticle(result);

    removeFromSaved('Python');
    expect(isSaved('Python')).toBe(false);
    expect(getSaved()).toHaveLength(0);
  });

  it('removing one article does not affect others', async () => {
    mockFetch(['Python'], 'Python');
    saveArticle(await research('Python'));

    mockFetch(['Java'], 'Java');
    saveArticle(await research('Java'));

    removeFromSaved('Python');

    expect(isSaved('Python')).toBe(false);
    expect(isSaved('Java')).toBe(true);
    expect(getSaved()).toHaveLength(1);
  });
});

// ─── Full flow: search → history + save → clear ───────────────────────────────

describe('clear operations', () => {
  it('clearHistory removes all history entries', async () => {
    mockFetch(['Python'], 'Python');
    addToHistory(await research('Python'));
    mockFetch(['Java'], 'Java');
    addToHistory(await research('Java'));

    clearHistory();
    expect(getHistory()).toEqual([]);
  });

  it('clearSaved removes all saved articles', async () => {
    mockFetch(['Python'], 'Python');
    saveArticle(await research('Python'));

    clearSaved();
    expect(getSaved()).toEqual([]);
    expect(isSaved('Python')).toBe(false);
  });

  it('clearHistory does not affect saved articles', async () => {
    mockFetch(['Python'], 'Python');
    const result = await research('Python');
    addToHistory(result);
    saveArticle(result);

    clearHistory();
    expect(getSaved()).toHaveLength(1);
    expect(isSaved('Python')).toBe(true);
  });

  it('clearSaved does not affect history', async () => {
    mockFetch(['Python'], 'Python');
    const result = await research('Python');
    addToHistory(result);
    saveArticle(result);

    clearSaved();
    expect(getHistory()).toHaveLength(1);
  });
});

// ─── related field ─────────────────────────────────────────────────────────────

describe('research result related field', () => {
  it('related is an array of strings', async () => {
    mockFetch(['Python'], 'Python');
    const result = await research('Python');
    expect(Array.isArray(result.related)).toBe(true);
    result.related.forEach(r => expect(typeof r).toBe('string'));
  });

  it('related is capped at 10 items', async () => {
    const links = Array.from({ length: 20 }, (_, i) => ({ title: `Link${i}` }));
    vi.stubGlobal('fetch', vi.fn()
      .mockReturnValueOnce(Promise.resolve({
        ok: true, json: () => Promise.resolve({ query: { search: [{ title: 'Big', pageid: 1, snippet: 'x' }] } })
      }))
      .mockReturnValueOnce(Promise.resolve({
        ok: true, json: () => Promise.resolve({
          title: 'Big', displaytitle: 'Big',
          extract: 'A long enough extract about the topic here.',
          thumbnail: null,
          content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Big' } }
        })
      }))
      .mockReturnValueOnce(Promise.resolve({
        ok: true, json: () => Promise.resolve({ query: { pages: { '1': { links } } } })
      }))
    );
    const result = await research('Big topic');
    expect(result.related.length).toBeLessThanOrEqual(10);
  });
});
