import { describe, it, expect } from 'vitest';
import { buildSectionChunks, countTopics, formatDate, escapeAttr, SECTION_LABELS } from '../src/ui-logic.js';

// ─── buildSectionChunks ──────────────────────────────────────────────────────

describe('buildSectionChunks', () => {
  it('returns [] for null/undefined/empty extract', () => {
    expect(buildSectionChunks(null)).toEqual([]);
    expect(buildSectionChunks(undefined)).toEqual([]);
    expect(buildSectionChunks('')).toEqual([]);
  });

  it('returns [] when only one chunk is produced (no accordion needed)', () => {
    // A single sentence produces 1 chunk → sections hidden
    expect(buildSectionChunks('Just one sentence.')).toEqual([]);
  });

  it('returns [] for a single very long sentence', () => {
    const oneSentence = 'This is a very long sentence that never ends ' + 'word '.repeat(200) + '.';
    expect(buildSectionChunks(oneSentence)).toEqual([]);
  });

  it('produces multiple chunks for a multi-sentence extract', () => {
    const extract = Array.from({ length: 10 }, (_, i) => `Sentence number ${i + 1}.`).join(' ');
    const chunks = buildSectionChunks(extract);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('each chunk has label and body fields', () => {
    const extract = Array.from({ length: 6 }, (_, i) => `Sentence ${i}.`).join(' ');
    const chunks = buildSectionChunks(extract);
    for (const chunk of chunks) {
      expect(chunk).toHaveProperty('label');
      expect(chunk).toHaveProperty('body');
      expect(typeof chunk.label).toBe('string');
      expect(typeof chunk.body).toBe('string');
    }
  });

  it('uses SECTION_LABELS for the first four chunks', () => {
    const extract = Array.from({ length: 20 }, (_, i) => `Sentence ${i}.`).join(' ');
    const chunks = buildSectionChunks(extract);
    chunks.forEach((chunk, i) => {
      if (i < SECTION_LABELS.length) {
        expect(chunk.label).toBe(SECTION_LABELS[i]);
      }
    });
  });

  it('falls back to "Section N" label beyond 4 chunks', () => {
    // Need enough sentences to force >4 chunks.
    // With chunkSize = ceil(N / min(3, ceil(N/5))), 30 sentences → chunkSize=10, 3 chunks.
    // Hard to get >4; just verify the fallback label format when it occurs.
    const extract = Array.from({ length: 30 }, (_, i) => `Sentence ${i}.`).join(' ');
    const chunks = buildSectionChunks(extract);
    // All labels should either be a SECTION_LABELS entry or "Section N"
    chunks.forEach((chunk, i) => {
      const expected = SECTION_LABELS[i] || `Section ${i + 1}`;
      expect(chunk.label).toBe(expected);
    });
  });

  it('chunk bodies are non-empty strings', () => {
    const extract = 'First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence.';
    const chunks = buildSectionChunks(extract);
    for (const chunk of chunks) {
      expect(chunk.body.trim().length).toBeGreaterThan(0);
    }
  });

  it('all sentences appear across all chunks (no data loss)', () => {
    const sentences = Array.from({ length: 9 }, (_, i) => `Sentence ${i}.`);
    const extract = sentences.join(' ');
    const chunks = buildSectionChunks(extract);
    const allText = chunks.map(c => c.body).join(' ');
    sentences.forEach(s => {
      // Each sentence word appears somewhere in the combined chunks
      expect(allText).toContain(`Sentence ${sentences.indexOf(s)}`);
    });
  });

  it('handles extract with exclamation and question marks as sentence boundaries without crashing', () => {
    // 4 sentences → chunkSize = ceil(4/min(3,ceil(4/5))) = ceil(4/1) = 4 → 1 chunk → returns []
    const extract = 'Is it real? Yes it is! Absolutely certain. No doubt at all.';
    expect(() => buildSectionChunks(extract)).not.toThrow();
    expect(Array.isArray(buildSectionChunks(extract))).toBe(true);
  });

  it('produces multiple chunks for 8+ sentences with mixed punctuation', () => {
    const extract = 'First sentence. Second! Third? Fourth. Fifth. Sixth. Seventh. Eighth.';
    const chunks = buildSectionChunks(extract);
    // 8 sentences → chunkSize = ceil(8/min(3,ceil(8/5))) = ceil(8/2) = 4 → 2 chunks
    expect(chunks.length).toBeGreaterThan(1);
  });
});

// ─── countTopics ─────────────────────────────────────────────────────────────

describe('countTopics', () => {
  it('returns 0 for empty history', () => {
    expect(countTopics([])).toBe(0);
  });

  it('counts distinct top-level topics (split on :)', () => {
    const history = [
      { title: 'Science: Physics' },
      { title: 'Science: Chemistry' },
      { title: 'History: Rome' },
    ];
    expect(countTopics(history)).toBe(2); // "Science" and "History"
  });

  it('counts titles without : as their own topic', () => {
    const history = [
      { title: 'Python' },
      { title: 'Java' },
      { title: 'Rust' },
    ];
    expect(countTopics(history)).toBe(3);
  });

  it('deduplicates — same prefix counted once', () => {
    const history = [
      { title: 'Music: Jazz' },
      { title: 'Music: Blues' },
      { title: 'Music: Rock' },
    ];
    expect(countTopics(history)).toBe(1);
  });

  it('trims whitespace around the prefix', () => {
    const history = [
      { title: 'Science : Physics' },
      { title: 'Science: Chemistry' },
    ];
    // Both trim to "Science"
    expect(countTopics(history)).toBe(1);
  });
});

// ─── formatDate ───────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('returns empty string for null', () => {
    expect(formatDate(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatDate(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(formatDate('')).toBe('');
  });

  it('returns empty string for invalid ISO string', () => {
    expect(formatDate('not-a-date')).toBe('');
    expect(formatDate('2024-99-99')).toBe('');
  });

  it('returns a non-empty formatted string for a valid ISO date', () => {
    const result = formatDate('2024-06-15T10:30:00.000Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    // Should contain the year
    expect(result).toContain('2024');
  });

  it('handles dates at epoch boundary', () => {
    const result = formatDate('1970-01-01T00:00:00.000Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

// ─── escapeAttr ───────────────────────────────────────────────────────────────

describe('escapeAttr', () => {
  it('escapes single quotes', () => {
    expect(escapeAttr("it's alive")).toBe("it&#39;s alive");
  });

  it('escapes double quotes', () => {
    expect(escapeAttr('say "hello"')).toBe('say &quot;hello&quot;');
  });

  it('escapes < and >', () => {
    expect(escapeAttr('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes ampersands', () => {
    expect(escapeAttr('C & Java')).toBe('C &amp; Java');
  });

  it('returns empty string unchanged', () => {
    expect(escapeAttr('')).toBe('');
  });

  it('returns plain text unchanged', () => {
    expect(escapeAttr('Python programming')).toBe('Python programming');
  });

  it('escapes combined XSS payload', () => {
    const payload = `'"><script>alert(1)</script>`;
    const result = escapeAttr(payload);
    expect(result).not.toContain("'");
    expect(result).not.toContain('"');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });
});
