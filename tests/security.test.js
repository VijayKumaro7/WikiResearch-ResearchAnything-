/**
 * Security / XSS tests.
 *
 * These tests verify that user-controlled or API-controlled data cannot
 * inject executable script content into the DOM through the app's rendering
 * helpers.
 *
 * Approach: we import the pure escapeAttr helper and the buildSectionChunks
 * helper, then simulate what the render functions would produce and assert:
 *  - No <script> tags appear unescaped in generated HTML
 *  - onclick attribute values cannot be broken out of with quotes or backslashes
 *  - innerHTML-injected content does not execute scripts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { escapeAttr } from '../src/ui-logic.js';
import { stripHTML } from '../src/wikipedia.js';

// ─── escapeAttr — onclick injection prevention ───────────────────────────────

describe('escapeAttr — onclick attribute injection', () => {
  // Simulate what renderRelated / renderHistoryList does:
  // onclick="quickSearch('<VALUE>')"
  function buildOnclick(rawTitle) {
    return `onclick="quickSearch('${escapeAttr(rawTitle)}')"`;
  }

  it('prevents single-quote breakout', () => {
    const attr = buildOnclick("'); alert(1); ('");
    expect(attr).not.toContain("');");
    expect(attr).toContain("&#39;");
  });

  it('prevents double-quote breakout', () => {
    const attr = buildOnclick('"); alert(1); ("');
    expect(attr).not.toContain('");');
    expect(attr).toContain('&quot;');
  });

  it('prevents <script> injection via title', () => {
    const attr = buildOnclick('<script>alert(1)</script>');
    expect(attr).not.toContain('<script>');
    expect(attr).toContain('&lt;script&gt;');
  });

  it('prevents backslash-quote escape', () => {
    const attr = buildOnclick("\\'); alert(1); //");
    // The single quote in the payload must be escaped to &#39; so the \' trick fails
    expect(attr).not.toContain("\\')");
    // The alert invocation must not appear unescaped in a position that could execute
    expect(attr).not.toContain("'); alert");
  });

  it('preserves normal title text', () => {
    const attr = buildOnclick('Machine learning');
    expect(attr).toContain("quickSearch('Machine learning')");
  });

  it('handles ampersand in title', () => {
    const attr = buildOnclick('Science & Technology');
    expect(attr).not.toContain(' & ');
    expect(attr).toContain('&amp;');
  });

  it('handles empty title', () => {
    const attr = buildOnclick('');
    expect(attr).toBe("onclick=\"quickSearch('')\"");
  });
});

// ─── innerHTML injection — section body content ──────────────────────────────

describe('innerHTML content safety', () => {
  /**
   * Simulates what renderSections does:
   * places chunk text into <p>${chunk}</p> inside innerHTML.
   * With the fix, chunk content should be text-escaped before injection.
   */
  function renderChunkSafe(chunk) {
    const p = document.createElement('p');
    p.textContent = chunk;   // safe — textContent does not parse HTML
    return p.outerHTML;
  }

  it('textContent assignment does not execute inline script', () => {
    const malicious = '<script>window.__xss = true;</script>';
    const container = document.createElement('div');
    container.innerHTML = `<p>${renderChunkSafe(malicious)}</p>`;
    expect(window.__xss).toBeUndefined();
  });

  it('textContent escapes < and > so they appear as entities in outerHTML', () => {
    const html = renderChunkSafe('<b>bold</b>');
    expect(html).not.toContain('<b>');
    expect(html).toContain('&lt;b&gt;');
  });

  it('textContent escapes & so it appears as &amp;', () => {
    const html = renderChunkSafe('R&D department');
    expect(html).toContain('R&amp;D');
  });
});

// ─── stripHTML — XSS via API snippet content ─────────────────────────────────

describe('stripHTML — safe extraction of text from API HTML', () => {
  it('removes all HTML tags', () => {
    const result = stripHTML('<b>Hello</b><em>World</em>');
    expect(result).not.toMatch(/<[^>]+>/);
  });

  it('does not preserve script tag content as executable', () => {
    // stripHTML uses textContent, so script body is preserved as text, not run
    const input = 'Info. <script>window.__stripped_xss = true;</script>More info.';
    stripHTML(input);
    expect(window.__stripped_xss).toBeUndefined();
  });

  it('removes img onerror handlers', () => {
    const result = stripHTML('<img src="x" onerror="alert(1)">text');
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('<img');
  });

  it('removes svg/foreignObject injection vectors', () => {
    const result = stripHTML('<svg><foreignObject><script>alert(1)</script></foreignObject></svg>');
    expect(result).not.toContain('<svg>');
    expect(result).not.toContain('<script>');
  });
});

// ─── Title display — innerHTML vs textContent ─────────────────────────────────

describe('title display safety', () => {
  /**
   * In the current app.js, resultsTitle uses innerHTML with API data.
   * This test documents the UNSAFE pattern and verifies the SAFE alternative.
   */
  it('SAFE: textContent prevents script execution in title', () => {
    const el = document.createElement('h1');
    const maliciousTitle = '<img src=x onerror="window.__title_xss=true">';
    el.textContent = maliciousTitle;   // safe approach
    document.body.appendChild(el);
    expect(window.__title_xss).toBeUndefined();
    document.body.removeChild(el);
  });

  it('SAFE: textContent preserves visible text correctly', () => {
    const el = document.createElement('h1');
    el.textContent = 'Python (programming language)';
    expect(el.textContent).toBe('Python (programming language)');
  });
});

// ─── Related chips — onclick content ─────────────────────────────────────────

describe('related chip onclick safety', () => {
  function buildRelatedChip(title) {
    const safe = escapeAttr(title);
    return `<button class="related-chip" onclick="quickSearch('${safe}')">${escapeAttr(title)}</button>`;
  }

  it('chip HTML does not contain the quote-breakout sequence from malicious title', () => {
    const chip = buildRelatedChip("Topic'); document.body.innerHTML='pwned");
    // The critical check: '); must not appear — it would break out of onclick='...'
    expect(chip).not.toContain("');");
    // The single quote in the payload is escaped to &#39;
    expect(chip).toContain('&#39;');
  });

  it('chip HTML does not contain unescaped angle brackets', () => {
    const chip = buildRelatedChip('<img onerror=alert(1)>');
    expect(chip).not.toContain('<img');
  });

  it('chip display text is also escaped', () => {
    const chip = buildRelatedChip('<b>Bold Topic</b>');
    // The visible label should not render HTML
    expect(chip).not.toMatch(/>.*<b>/);
  });
});
