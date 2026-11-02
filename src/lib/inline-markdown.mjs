// Minimal inline markdown for single-line frontmatter fields (post title,
// description, tags, cover caption). Astro's own markdown pipeline is
// block-oriented (wraps output in <p>), which doesn't suit a title or a
// <title> tag, so these fields get their own small renderer instead.
// Supports `code`, [text](url), **bold**/__bold__, and *italic*/_italic_ —
// escapes everything else so stray HTML in a field can't break the page.
// Plain .mjs (not .ts) so scripts/dev-edit-blog.mjs can import it directly
// under plain Node, outside Astro/Vite's TS pipeline.

/** @param {string} s */
const escapeHtml = (s) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** @param {string} text */
export function renderInlineMarkdown(text) {
  let html = escapeHtml(text);

  // code spans first, so markup characters inside `...` aren't touched below
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, url) =>
    /^(https?:|mailto:|\/|#)/i.test(url) ? `<a href="${url}">${label}</a>` : match
  );

  // bold before italic so **text**/__text__ isn't left with stray single
  // asterisks/underscores; both delimiters supported since posts mix them
  // (e.g. `_title_` next to `**bold**`)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

  return html;
}

// Plain-text version for contexts that can't render HTML: <title>, meta
// description, image alt text.
/** @param {string} text */
export function stripMarkdown(text) {
  return text
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)\s]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1');
}
