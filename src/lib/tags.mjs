// Shared tag-slug logic for the blog's tag archive (`/blog/tags`,
// `/blog/tags/[tag]`) and for turning a post's tag badges into links
// wherever they're rendered. Slugs are derived from the tag's plain-text
// form (markdown stripped, lowercased, non-alphanumerics collapsed to
// hyphens) so the same tag always resolves to the same URL regardless of
// casing or markdown formatting — matching the case-insensitive deduping
// the blog index already does for its tag filter pills.
// Plain .mjs so it can be imported the same way from .astro files, matching
// inline-markdown.mjs / reading-time.mjs.
import { stripMarkdown } from './inline-markdown.mjs';

/** @param {string} tag */
export function tagSlug(tag) {
  return stripMarkdown(tag)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Groups posts by tag slug, keeping the first-seen display label (casing,
// markdown) for each. Sorted by post count descending, then alphabetically
// by label — with a large or growing tag list, surfacing the tags with the
// most posts first is more useful for browsing than raw alphabetical order.
/** @param {{ data: { tags?: string[] } }[]} posts */
export function collectTags(posts) {
  /** @type {Map<string, { slug: string; label: string; posts: typeof posts }>} */
  const bySlug = new Map();
  for (const post of posts) {
    for (const tag of post.data.tags ?? []) {
      const slug = tagSlug(tag);
      if (!slug) continue;
      let entry = bySlug.get(slug);
      if (!entry) {
        entry = { slug, label: tag, posts: [] };
        bySlug.set(slug, entry);
      }
      entry.posts.push(post);
    }
  }
  return [...bySlug.values()].sort(
    (a, b) => b.posts.length - a.posts.length || a.label.localeCompare(b.label)
  );
}
