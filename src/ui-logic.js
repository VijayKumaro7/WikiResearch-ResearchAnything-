/**
 * UI logic helpers — pure functions extracted from UIController for testability.
 * These have no side-effects and can run in jsdom without a full DOM tree.
 */

export const SECTION_LABELS = ['Overview', 'Background', 'Key Details', 'Further Context'];

/**
 * Split an extract string into 2-4 labelled chunks for the accordion.
 * Returns [] if the extract produces only one chunk (not worth showing).
 * @param {string} extract
 * @returns {{ label: string, body: string }[]}
 */
export function buildSectionChunks(extract) {
  if (!extract) return [];

  const sentences = extract.match(/[^.!?]+[.!?]+/g) || [extract];
  const chunkSize = Math.ceil(sentences.length / Math.min(3, Math.ceil(sentences.length / 5)));
  const chunks = [];
  for (let i = 0; i < sentences.length; i += chunkSize) {
    chunks.push(sentences.slice(i, i + chunkSize).join(' ').trim());
  }

  if (chunks.length <= 1) return [];

  return chunks.map((body, i) => ({ label: SECTION_LABELS[i] || `Section ${i + 1}`, body }));
}

/**
 * Count unique top-level topics from a history array.
 * Topics are derived by splitting each title on ':' and taking the first part.
 * @param {{ title: string }[]} history
 * @returns {number}
 */
export function countTopics(history) {
  return new Set(history.map(h => h.title.split(':')[0].trim())).size;
}

/**
 * Format an ISO date string for display.
 * Returns '' for falsy or invalid input.
 * @param {string} iso
 * @returns {string}
 */
export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Escape a string for safe use inside a single-quoted HTML attribute.
 * Prevents breaking out of onclick="quickSearch('...')" attribute values.
 * @param {string} str
 * @returns {string}
 */
export function escapeAttr(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
