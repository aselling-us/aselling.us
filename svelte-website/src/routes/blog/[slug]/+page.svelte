<script lang="ts">
  import type { PageData } from "./$types";
 import { marked } from "marked";
  import markedFootnote from 'marked-footnote';
  let { data }: { data: PageData } = $props();
  const post = $derived(data.post);
</script>

<svelte:head>
	<title>{marked.parseInline(post.title)}</title>
	<!-- <meta name="description" content={post.description} /> -->
</svelte:head>

<article class="post">
  <span
    >{post.date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })}{" · "}
    {post.minutes}</span
  >
  <h1>{@html marked.parseInline(post.title)}</h1>

  {#if post.cover}
    <figure>
      <img
        src={post.cover}
        alt={post.coverCaption ?? `Cover art for ${post.title}`}
        width="720"
      />
      {#if post.coverCaption}<figcaption>{post.coverCaption}</figcaption>{/if}
    </figure>
  {/if}

  <div class="prose">{@html post.html}</div>
</article>

<style>
  .post {
    max-width: 68ch;
    margin: 0 auto;
  }

  .post-cover {
    margin: var(--space-3) 0 0;
  }
  .post-cover img {
    width: 100%;
    height: auto;
    display: block;
    border: 1px solid var(--color-hairline);
  }
  .post-cover figcaption {
    margin-top: 0.4rem;
    text-transform: none;
    letter-spacing: 0.04em;
  }

  .prose { margin-top: var(--space-3); }
  .prose :global(p) { color: var(--color-text); }
  .prose :global(img) {
    max-width: 100%;
    height: auto;
    display: block;
    margin: var(--space-3) auto;
    border: 1px solid var(--color-hairline);
  }
  /* captioned inline images (markdown `![alt](src "caption")`) are wrapped
     in a figure by rehype-image-captions.mjs — reset the img's own margin
     so the figure owns the spacing instead */
  .prose :global(figure) { margin: var(--space-3) auto; }
  .prose :global(figure img) { margin: 0; }
  .prose :global(figcaption) {
    margin-top: 0.4rem;
    text-align: center;
    text-transform: none;
    letter-spacing: 0.04em;
  }
  /* `==highlight==` markdown (remark-flexible-markers, see astro.config.mjs)
     — gold, not blue, since blue is already the link color */
  .prose :global(mark) {
    background: var(--color-highlight-bright);
    color: var(--color-bg);
    padding: 0.05em 0.2em;
    border-radius: 2px;
  }
  .prose :global(blockquote) {
    position: relative;
    margin: var(--space-3) 0;
    padding: var(--space-2) var(--space-3);
    border-left: 2px solid var(--color-highlight);
    background: var(--color-bg-inset);
    font-family: var(--font-display);
    font-style: italic;
    font-size: 1.1rem;
    line-height: 1.6;
    color: var(--color-text);
  }
  .prose :global(blockquote::before) {
    content: '\201C';
    position: absolute;
    top: -0.1em;
    left: var(--space-1);
    font-family: var(--font-display);
    font-style: normal;
    font-size: 2.4rem;
    line-height: 1;
    color: var(--color-hairline-bright);
  }
  .prose :global(blockquote p) {
    margin: 0 0 var(--space-1);
    padding-left: var(--space-2);
  }
  .prose :global(blockquote p:last-child) {
    margin-bottom: 0;
  }
  /* `---` on its own line (thematic break) -- needs a blank line above and
     below or CommonMark treats it as a setext heading underline instead */
  .prose :global(hr) {
    border: none;
    border-top: 1px solid var(--color-hairline);
    margin: var(--space-4) 0;
  }

  .tag-list {
    list-style: none;
    display: flex;
    gap: 0.5rem;
    padding: 0;
    margin: 0.8rem 0 0;
  }
  .tag a {
    display: inline-block;
    color: var(--color-accent-bright);
    border: 1px solid var(--color-hairline-bright);
    border-radius: 3px;
    padding: 0.15rem 0.5rem;
    text-decoration: none;
    transition: color 0.15s ease, border-color 0.15s ease;
  }
  .tag a:hover {
    color: var(--color-highlight-bright);
    border-color: var(--color-highlight);
  }

  .related-post {
    margin-top: var(--space-4);
    padding-top: var(--space-2);
    border-top: 1px solid var(--color-hairline);
  }
  .related-post .section-label {
    color: var(--color-highlight-bright);
    font-size: 0.7rem;
    font-weight: 400;
    display: block;
    margin-bottom: var(--space-1);
  }
  .related-link {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-2);
    flex-wrap: wrap;
  }
  .related-title {
    font-family: var(--font-display);
    font-size: 1rem;
    color: var(--color-accent-bright);
  }
  .related-link:hover .related-title { color: var(--color-highlight-bright); }
  .related-date { color: var(--color-text-faint); flex-shrink: 0; }
</style>