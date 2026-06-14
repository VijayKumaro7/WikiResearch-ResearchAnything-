/**
 * WikipediaService — ES module extracted from app.js for testability.
 * All internal functions are exported individually so they can be unit-tested.
 */

const BASE = 'https://en.wikipedia.org/api/rest_v1';
const SEARCH_BASE = 'https://en.wikipedia.org/w/api.php';

/**
 * Strip HTML tags from a string using a DOM element.
 * @param {string} html
 * @returns {string}
 */
export function stripHTML(html) {
  const d = document.createElement('div');
  d.innerHTML = html;
  return d.textContent || d.innerText || '';
}

/**
 * Search for Wikipedia articles matching a query.
 * @param {string} query
 * @returns {Promise<Array>}
 */
export async function search(query) {
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
    throw new TypeError('NETWORK_ERROR');
  }
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  const data = await res.json();
  return data.query?.search || [];
}

/**
 * Fetch full article summary. Falls back to MediaWiki API if REST summary fails.
 * @param {string} title
 * @returns {Promise<Object>}
 */
export async function getSummary(title) {
  const encoded = encodeURIComponent(title.replace(/ /g, '_'));

  // Primary: REST v1 summary
  try {
    const res = await fetch(`${BASE}/page/summary/${encoded}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (res.ok) {
      const data = await res.json();
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
 * Fetch related pages (internal links) for a given title.
 * @param {string} title
 * @returns {Promise<string[]>}
 */
export async function getRelated(title) {
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
 * Fetch full article sections/content.
 * @param {string} title
 * @returns {Promise<Object>}
 */
export async function getSections(title) {
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
 * Fetch the full plain-text article with section markers (== Heading ==).
 * Best-effort: returns null on any failure so callers can degrade gracefully.
 * @param {string} title
 * @returns {Promise<string|null>}
 */
export async function getFullContent(title) {
  const params = new URLSearchParams({
    action: 'query',
    titles: title,
    prop: 'extracts',
    explaintext: '1',
    exsectionformat: 'wiki',
    redirects: '1',
    format: 'json',
    origin: '*'
  });
  let res;
  try {
    res = await fetch(`${SEARCH_BASE}?${params}`);
  } catch (_) {
    return null;
  }
  if (!res || !res.ok) return null;
  const data = await res.json();
  const pages = Object.values(data.query?.pages || {});
  return pages[0]?.extract || null;
}

/** Section names that hold links/citations rather than informative prose. */
const BOILERPLATE_SECTIONS =
  /^(references|external links|see also|further reading|notes|citations|bibliography|sources|footnotes|works cited)$/i;

/**
 * Split a full plain-text article (with `== Heading ==` markers) into real
 * top-level sections. Subsection headings are kept inline within their parent.
 * Boilerplate and empty sections are dropped.
 * @param {string} fullText
 * @returns {Array<{title: string, content: string}>}
 */
export function parseSections(fullText) {
  if (!fullText) return [];
  const sections = [];
  let current = null;
  for (const line of fullText.split('\n')) {
    const m = line.match(/^(={2,6})\s*(.+?)\s*\1\s*$/);
    if (m) {
      const level = m[1].length;
      const heading = m[2].trim();
      if (level === 2) {
        if (current && current.content.trim()) sections.push(current);
        current = BOILERPLATE_SECTIONS.test(heading) ? null : { title: heading, content: '' };
      } else if (current) {
        current.content += `\n${heading}\n`;
      }
    } else if (current) {
      current.content += line + '\n';
    }
  }
  if (current && current.content.trim()) sections.push(current);
  return sections
    .map(s => ({ title: s.title, content: s.content.trim() }))
    .filter(s => s.content.length > 0);
}

/**
 * Extract the lead/intro text (everything before the first section heading).
 * @param {string} fullText
 * @returns {string}
 */
export function extractIntro(fullText) {
  if (!fullText) return '';
  const idx = fullText.search(/\n={2,6}\s/);
  return (idx === -1 ? fullText : fullText.slice(0, idx)).trim();
}

/**
 * Main research function: orchestrates search + summary + related with retry logic.
 * @param {string} query
 * @returns {Promise<Object>}
 */
export async function research(query) {
  let results;
  try {
    results = await search(query);
  } catch (err) {
    if (err instanceof TypeError) throw new Error('NETWORK_ERROR');
    throw err;
  }

  if (!results || results.length === 0) throw new Error('NO_RESULTS');

  let summary = null;
  let usedTitle = null;
  let usedSnippet = '';

  for (let i = 0; i < Math.min(results.length, 3); i++) {
    const candidate = results[i];
    try {
      summary = await getSummary(candidate.title);
      usedTitle = candidate.title;
      usedSnippet = candidate.snippet || '';
      if (summary.extract && summary.extract.trim().length > 30) break;
    } catch (_) {
      // Try next result
    }
  }

  // If all failed, use snippet text as extract
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

  let related = [];
  try {
    related = await getRelated(usedTitle || results[0].title);
  } catch (_) { /* related is optional */ }

  // Pull the full article (best-effort) for richer, section-by-section detail.
  let sections = [];
  let fullIntro = '';
  try {
    const fullText = await getFullContent(usedTitle || results[0].title);
    if (fullText) {
      sections = parseSections(fullText);
      fullIntro = extractIntro(fullText);
    }
  } catch (_) { /* full content is optional — fall back to the summary */ }

  // Prefer the fuller lead section when available, otherwise the short summary.
  const summaryExtract = summary.extract || stripHTML(usedSnippet);
  const extract = fullIntro.length > summaryExtract.length ? fullIntro : summaryExtract;

  return {
    query,
    title: summary.title || usedTitle,
    displayTitle: stripHTML(summary.displaytitle || summary.title || usedTitle),
    extract,
    sections,
    thumbnail: summary.thumbnail?.source || null,
    wikiUrl: summary.content_urls?.desktop?.page ||
      `https://en.wikipedia.org/wiki/${encodeURIComponent((usedTitle || '').replace(/ /g, '_'))}`,
    related: related.slice(0, 10),
    timestamp: new Date().toISOString()
  };
}

const WikipediaService = {
  search, getSummary, getRelated, getSections, getFullContent,
  parseSections, extractIntro, research, stripHTML
};
export default WikipediaService;
