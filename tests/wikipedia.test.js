import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  search, getSummary, getRelated, getSections, getFullContent,
  parseSections, extractIntro, research, stripHTML
} from '../src/wikipedia.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Build a minimal fetch Response mock */
function mockResponse(body, { ok = true, status = 200 } = {}) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  });
}

/** Build a standard MediaWiki search response */
function mwSearchResponse(titles = ['Python (programming language)']) {
  return {
    query: {
      search: titles.map((title, i) => ({
        title,
        pageid: 1000 + i,
        snippet: `<b>${title}</b> snippet text about the topic.`,
      })),
    },
  };
}

/** Build a Wikipedia REST summary response */
function restSummaryResponse(title, extract = 'A long enough extract that passes the 30 char threshold.') {
  return {
    title,
    displaytitle: title,
    extract,
    thumbnail: { source: 'https://upload.wikimedia.org/thumb.jpg' },
    content_urls: { desktop: { page: `https://en.wikipedia.org/wiki/${title}` } },
  };
}

/** Build a MediaWiki parse response */
function mwParseResponse(sections = [{ line: 'History', index: '1' }]) {
  return { parse: { sections } };
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── stripHTML ───────────────────────────────────────────────────────────────

describe('stripHTML', () => {
  it('removes HTML tags', () => {
    expect(stripHTML('<b>Hello</b> <em>world</em>')).toBe('Hello world');
  });

  it('returns plain text unchanged', () => {
    expect(stripHTML('plain text')).toBe('plain text');
  });

  it('handles empty string', () => {
    expect(stripHTML('')).toBe('');
  });

  it('handles nested tags', () => {
    expect(stripHTML('<div><p><span>deep</span></p></div>')).toBe('deep');
  });

  it('strips script tags (content still extracted as text)', () => {
    // The browser textContent of a <script> tag is the raw source; jsdom may differ.
    // The important thing is no HTML tags remain.
    const result = stripHTML('<b>visible</b><script>alert(1)</script>');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });

  it('decodes HTML entities via browser engine', () => {
    expect(stripHTML('&lt;b&gt;')).toBe('<b>');
  });
});

// ─── search ──────────────────────────────────────────────────────────────────

describe('search', () => {
  it('returns array of results for a valid query', async () => {
    fetch.mockReturnValue(mockResponse(mwSearchResponse(['Python', 'Java'])));
    const results = await search('programming');
    expect(results).toHaveLength(2);
    expect(results[0].title).toBe('Python');
  });

  it('returns empty array when query matches nothing', async () => {
    fetch.mockReturnValue(mockResponse({ query: { search: [] } }));
    const results = await search('xkjhsdf2398');
    expect(results).toEqual([]);
  });

  it('returns empty array when response has no query.search', async () => {
    fetch.mockReturnValue(mockResponse({}));
    const results = await search('anything');
    expect(results).toEqual([]);
  });

  it('throws TypeError NETWORK_ERROR when fetch itself fails', async () => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(search('test')).rejects.toThrow('NETWORK_ERROR');
    await expect(search('test')).rejects.toBeInstanceOf(TypeError);
  });

  it('throws Error when response is not ok', async () => {
    fetch.mockReturnValue(mockResponse({}, { ok: false, status: 503 }));
    await expect(search('test')).rejects.toThrow('Search failed: 503');
  });
});

// ─── parseSections ────────────────────────────────────────────────────────────

describe('parseSections', () => {
  const article = [
    'Intro paragraph that is the lead section.',
    '',
    '== History ==',
    'History content here.',
    '',
    '=== Early years ===',
    'Sub-section content stays inside History.',
    '',
    '== Legacy ==',
    'Legacy content.',
    '',
    '== References ==',
    'Citation 1. Citation 2.',
  ].join('\n');

  it('splits an article into its top-level sections', () => {
    const sections = parseSections(article);
    expect(sections.map(s => s.title)).toEqual(['History', 'Legacy']);
  });

  it('keeps subsection content within its parent section', () => {
    const sections = parseSections(article);
    const history = sections.find(s => s.title === 'History');
    expect(history.content).toContain('Early years');
    expect(history.content).toContain('Sub-section content');
  });

  it('drops boilerplate sections like References', () => {
    const titles = parseSections(article).map(s => s.title);
    expect(titles).not.toContain('References');
  });

  it('returns an empty array for empty or missing input', () => {
    expect(parseSections('')).toEqual([]);
    expect(parseSections(null)).toEqual([]);
  });

  it('drops sections that have no content', () => {
    const sections = parseSections('Lead.\n\n== Empty ==\n\n== Real ==\nText.');
    expect(sections.map(s => s.title)).toEqual(['Real']);
  });
});

// ─── extractIntro ─────────────────────────────────────────────────────────────

describe('extractIntro', () => {
  it('returns text before the first section heading', () => {
    expect(extractIntro('Lead text.\n\n== History ==\nMore.')).toBe('Lead text.');
  });

  it('returns the whole text when there are no headings', () => {
    expect(extractIntro('Just a lead with no sections.')).toBe('Just a lead with no sections.');
  });

  it('returns empty string for falsy input', () => {
    expect(extractIntro('')).toBe('');
    expect(extractIntro(null)).toBe('');
  });
});

// ─── getFullContent ───────────────────────────────────────────────────────────

describe('getFullContent', () => {
  it('returns the page extract on success', async () => {
    fetch.mockReturnValue(mockResponse({
      query: { pages: { '1': { extract: 'Lead.\n\n== History ==\nText.' } } },
    }));
    const text = await getFullContent('Python');
    expect(text).toContain('== History ==');
  });

  it('returns null when the request is not ok', async () => {
    fetch.mockReturnValue(mockResponse({}, { ok: false, status: 500 }));
    expect(await getFullContent('Python')).toBeNull();
  });

  it('returns null when fetch itself throws (best-effort)', async () => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await getFullContent('Python')).toBeNull();
  });
});

// ─── getSummary ───────────────────────────────────────────────────────────────

describe('getSummary', () => {
  it('returns REST summary when REST API succeeds', async () => {
    fetch.mockReturnValue(mockResponse(restSummaryResponse('Python')));
    const result = await getSummary('Python');
    expect(result.title).toBe('Python');
    expect(result.extract).toContain('long enough');
  });

  it('falls back to MediaWiki API when REST returns no extract', async () => {
    const restNoExtract = { title: 'Stub', extract: '' };
    const mwFallback = {
      query: {
        pages: {
          '1': {
            title: 'Stub Page',
            extract: 'Fallback extract from MediaWiki API.',
            fullurl: 'https://en.wikipedia.org/wiki/Stub_Page',
          },
        },
      },
    };
    fetch
      .mockReturnValueOnce(mockResponse(restNoExtract))   // REST → no extract
      .mockReturnValueOnce(mockResponse(mwFallback));      // MediaWiki fallback
    const result = await getSummary('Stub');
    expect(result.extract).toBe('Fallback extract from MediaWiki API.');
  });

  it('falls back to MediaWiki API when REST fetch throws', async () => {
    const mwFallback = {
      query: {
        pages: {
          '1': { title: 'Fallback Title', extract: 'Some extract.', fullurl: 'https://en.wikipedia.org/wiki/Fallback' },
        },
      },
    };
    fetch
      .mockRejectedValueOnce(new Error('network'))   // REST throws
      .mockReturnValueOnce(mockResponse(mwFallback)); // MediaWiki succeeds
    const result = await getSummary('Fallback Title');
    expect(result.title).toBe('Fallback Title');
  });

  it('throws when article is marked missing in MediaWiki response', async () => {
    fetch
      .mockRejectedValueOnce(new Error('REST fail'))
      .mockReturnValueOnce(mockResponse({
        query: { pages: { '-1': { missing: '', title: 'NONEXISTENT_XYZ' } } },
      }));
    await expect(getSummary('NONEXISTENT_XYZ')).rejects.toThrow('404');
  });

  it('throws when MediaWiki response is not ok', async () => {
    fetch
      .mockRejectedValueOnce(new Error('REST fail'))
      .mockReturnValueOnce(mockResponse({}, { ok: false, status: 500 }));
    await expect(getSummary('Bad')).rejects.toThrow('Article not found: 500');
  });

  it('URL-encodes spaces in title', async () => {
    fetch.mockReturnValue(mockResponse(restSummaryResponse('Machine learning')));
    await getSummary('Machine learning');
    const url = fetch.mock.calls[0][0];
    expect(url).toContain('Machine_learning');
  });

  it('URL-encodes special characters in title', async () => {
    fetch.mockReturnValue(mockResponse(restSummaryResponse('C++ (programming language)')));
    await getSummary('C++ (programming language)');
    const url = fetch.mock.calls[0][0];
    expect(url).toContain(encodeURIComponent('C++'));
  });
});

// ─── getRelated ───────────────────────────────────────────────────────────────

describe('getRelated', () => {
  it('returns array of linked titles', async () => {
    fetch.mockReturnValue(mockResponse({
      query: { pages: { '1': { links: [{ title: 'Machine learning' }, { title: 'Neural network' }] } } },
    }));
    const related = await getRelated('Artificial intelligence');
    expect(related).toEqual(['Machine learning', 'Neural network']);
  });

  it('returns empty array when page has no links', async () => {
    fetch.mockReturnValue(mockResponse({
      query: { pages: { '1': {} } },
    }));
    const related = await getRelated('Stub');
    expect(related).toEqual([]);
  });

  it('returns empty array when response is not ok', async () => {
    fetch.mockReturnValue(mockResponse({}, { ok: false, status: 404 }));
    const related = await getRelated('Bad');
    expect(related).toEqual([]);
  });

  it('returns empty array when query.pages is empty object', async () => {
    fetch.mockReturnValue(mockResponse({ query: { pages: {} } }));
    const related = await getRelated('Empty');
    expect(related).toEqual([]);
  });
});

// ─── getSections ─────────────────────────────────────────────────────────────

describe('getSections', () => {
  it('returns parsed sections data', async () => {
    fetch.mockReturnValue(mockResponse(mwParseResponse([{ line: 'History' }, { line: 'Uses' }])));
    const data = await getSections('Python');
    expect(data.sections).toHaveLength(2);
    expect(data.sections[0].line).toBe('History');
  });

  it('returns { sections: [] } when response is not ok', async () => {
    fetch.mockReturnValue(mockResponse({}, { ok: false, status: 503 }));
    const data = await getSections('Bad');
    expect(data).toEqual({ sections: [] });
  });

  it('returns { sections: [] } when parse field is absent', async () => {
    fetch.mockReturnValue(mockResponse({}));
    const data = await getSections('NoParse');
    expect(data).toEqual({ sections: [] });
  });
});

// ─── research ────────────────────────────────────────────────────────────────

describe('research', () => {
  it('returns a complete result object for a valid query', async () => {
    fetch
      .mockReturnValueOnce(mockResponse(mwSearchResponse(['Python'])))           // search
      .mockReturnValueOnce(mockResponse(restSummaryResponse('Python')))          // getSummary REST
      .mockReturnValueOnce(mockResponse({                                        // getRelated
        query: { pages: { '1': { links: [{ title: 'Guido van Rossum' }] } } },
      }));

    const result = await research('Python programming');
    expect(result.title).toBe('Python');
    expect(result.extract).toBeTruthy();
    expect(result.wikiUrl).toMatch(/^https:\/\/en\.wikipedia\.org/);
    expect(Array.isArray(result.related)).toBe(true);
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.query).toBe('Python programming');
  });

  it('enriches the result with real article sections from full content', async () => {
    const fullText = [
      'A much longer lead section than the short REST summary provides, with plenty of detail.',
      '',
      '== History ==',
      'Detailed history content.',
      '',
      '== References ==',
      'Citations.',
    ].join('\n');

    fetch
      .mockReturnValueOnce(mockResponse(mwSearchResponse(['Python'])))            // search
      .mockReturnValueOnce(mockResponse(restSummaryResponse('Python', 'Short.'))) // getSummary REST
      .mockReturnValueOnce(mockResponse({                                         // getRelated
        query: { pages: { '1': { links: [{ title: 'Guido van Rossum' }] } } },
      }))
      .mockReturnValueOnce(mockResponse({                                         // getFullContent
        query: { pages: { '1': { extract: fullText } } },
      }));

    const result = await research('Python');
    expect(result.sections.map(s => s.title)).toEqual(['History']); // References dropped
    // Richer lead replaces the short REST summary
    expect(result.extract).toContain('longer lead section');
  });

  it('still returns a result (no sections) when full content is unavailable', async () => {
    fetch
      .mockReturnValueOnce(mockResponse(mwSearchResponse(['Python'])))
      .mockReturnValueOnce(mockResponse(restSummaryResponse('Python')))
      .mockReturnValueOnce(mockResponse({ query: { pages: { '1': {} } } })) // related
      .mockReturnValueOnce(mockResponse({}, { ok: false, status: 500 }));   // full content fails
    const result = await research('Python');
    expect(result.sections).toEqual([]);
    expect(result.extract).toContain('long enough');
  });

  it('strips HTML markup from the REST displaytitle', async () => {
    const restWithHtmlTitle = restSummaryResponse('1911 Revolution');
    restWithHtmlTitle.displaytitle =
      '<span lang="en" dir="ltr"><span class="mw-page-title-main">1911 Revolution</span></span>';

    fetch
      .mockReturnValueOnce(mockResponse(mwSearchResponse(['1911 Revolution'])))  // search
      .mockReturnValueOnce(mockResponse(restWithHtmlTitle))                       // getSummary REST
      .mockReturnValueOnce(mockResponse({ query: { pages: { '1': {} } } }));     // getRelated

    const result = await research('1911 Revolution');
    expect(result.displayTitle).toBe('1911 Revolution');
    expect(result.displayTitle).not.toContain('<span');
  });

  it('throws NO_RESULTS when search returns empty array', async () => {
    fetch.mockReturnValue(mockResponse({ query: { search: [] } }));
    await expect(research('xkjhsdf2398')).rejects.toThrow('NO_RESULTS');
  });

  it('throws NETWORK_ERROR when fetch itself fails during search', async () => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(research('test')).rejects.toThrow('NETWORK_ERROR');
  });

  it('retries with second candidate when first getSummary fails', async () => {
    fetch
      .mockReturnValueOnce(mockResponse(mwSearchResponse(['BadTitle', 'GoodTitle'])))  // search
      .mockRejectedValueOnce(new Error('404'))                                          // getSummary(BadTitle) REST fails
      .mockRejectedValueOnce(new Error('404'))                                          // getSummary(BadTitle) MediaWiki fails
      .mockReturnValueOnce(mockResponse(restSummaryResponse('GoodTitle')))              // getSummary(GoodTitle) REST succeeds
      .mockReturnValueOnce(mockResponse({ query: { pages: { '1': {} } } }));           // getRelated

    const result = await research('test');
    expect(result.title).toBe('GoodTitle');
  });

  it('retries up to 3 candidates before falling back to snippet', async () => {
    const searchResp = mwSearchResponse(['Bad1', 'Bad2', 'Bad3']);
    searchResp.query.search[0].snippet = '<b>Fallback</b> text.';

    fetch
      .mockReturnValueOnce(mockResponse(searchResp))
      // Bad1: REST + MediaWiki both fail
      .mockRejectedValueOnce(new Error('x'))
      .mockRejectedValueOnce(new Error('x'))
      // Bad2: REST + MediaWiki both fail
      .mockRejectedValueOnce(new Error('x'))
      .mockRejectedValueOnce(new Error('x'))
      // Bad3: REST + MediaWiki both fail
      .mockRejectedValueOnce(new Error('x'))
      .mockRejectedValueOnce(new Error('x'))
      // getRelated (optional, may or may not fire)
      .mockReturnValue(mockResponse({ query: { pages: { '1': {} } } }));

    const result = await research('fallback query');
    expect(result.title).toBe('Bad1');      // uses first search result
    expect(result.extract).toContain('Fallback text.');  // snippet stripped of HTML
  });

  it('still returns result even when getRelated fails', async () => {
    fetch
      .mockReturnValueOnce(mockResponse(mwSearchResponse(['Python'])))
      .mockReturnValueOnce(mockResponse(restSummaryResponse('Python')))
      .mockRejectedValueOnce(new Error('related failed'));

    const result = await research('Python');
    expect(result.related).toEqual([]);
  });

  it('limits related to 10 items', async () => {
    const links = Array.from({ length: 20 }, (_, i) => ({ title: `Link${i}` }));
    fetch
      .mockReturnValueOnce(mockResponse(mwSearchResponse(['Python'])))
      .mockReturnValueOnce(mockResponse(restSummaryResponse('Python')))
      .mockReturnValueOnce(mockResponse({
        query: { pages: { '1': { links } } },
      }));

    const result = await research('Python');
    expect(result.related).toHaveLength(10);
  });

  it('skips short extracts (≤30 chars) and tries the next candidate', async () => {
    const searchResp = mwSearchResponse(['ShortExtract', 'GoodTitle']);
    fetch
      .mockReturnValueOnce(mockResponse(searchResp))
      .mockReturnValueOnce(mockResponse({ ...restSummaryResponse('ShortExtract', 'Too short.') }))
      .mockReturnValueOnce(mockResponse(restSummaryResponse('GoodTitle')))
      .mockReturnValueOnce(mockResponse({ query: { pages: { '1': {} } } }));

    const result = await research('test');
    expect(result.title).toBe('GoodTitle');
  });

  it('includes a valid ISO timestamp', async () => {
    fetch
      .mockReturnValueOnce(mockResponse(mwSearchResponse(['Python'])))
      .mockReturnValueOnce(mockResponse(restSummaryResponse('Python')))
      .mockReturnValueOnce(mockResponse({ query: { pages: { '1': {} } } }));

    const result = await research('Python');
    expect(() => new Date(result.timestamp)).not.toThrow();
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });
});
