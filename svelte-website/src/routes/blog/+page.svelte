<script lang="ts">
  import Quote from "#lib/Quote.svelte";
  import type { PageData } from "./$types";
  //   import removeMd from 'remove-markdown';
  import { marked } from "marked";
  let { data }: { data: PageData } = $props();
  import { readingTimeLabel } from "#lib/reading-time.mjs";
  // $derived is to stay in sync with data
  const posts = $derived(data.posts.filter((post) => !post.draft || import.meta.env.DEV));
</script>

<h1>Writing</h1>
<p class="lede">
  A collection of critiques, thoughts, and journaling. Often pulled straight
  from my obsidian vault.
</p>
{#if import.meta.env.DEV}
  <button
    id="new-post"
    class="dev-btn mono-label"
    type="button"
    title="Dev only: writes src/content/blog/<slug>.md">+ new post</button
  >
{/if}
<p>FIXME subscribe form here</p>
<p>FIXME tags list</p>

<Quote cite="— Oscar Wilde, The Picture of Dorian Gray">
  Behind every exquisite thing that existed, there was something tragic. Worlds
  had to be in travail, that the meanest flower might blow...
</Quote>

<h2 class="mono-label section-label">
  <!-- <span>posts / {String(posts.length).padStart(2, '0')}</span> -->
  <span>posts / {posts.length} posts</span>
</h2>

<ul class="post-list">
  {#each posts as post}
    <li
      data-tags={JSON.stringify((post.tags ?? []).map((t) => t.toLowerCase()))}
    >
      <div class="post-main">
        <a
          class="post-link"
          href={post.draft ? `/blog/draft/${post.slug}` : `/blog/${post.slug}`}
        >
          <span>{@html marked.parseInline(post.title)}</span>
          <span class="mono-label post-date">
            {post.date.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
            {" · "}
            {readingTimeLabel(post.body)}
          </span>
          
          <!-- only show draft tag when in dev mode -->
          {#if post.draft && import.meta.env.DEV}
            <span class="draft-badge mono-label">draft</span>
          {/if}
        </a>

        {#if post.description}
          <p class="post-desc">{@html marked.parse(post.description)}</p>
        {/if}
        <!-- {showDevControls && post.data.draft && <span class="draft-badge mono-label">draft</span>}
        {showDevControls && (
          <button class="post-edit dev-btn mono-label" data-id={post.id} type="button">edit</button>
        )} -->
        <!-- <span class="mono-label post-date">
          {post.data.date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
          {' · '}
          {readingTimeLabel(post.body)}
        </span>

        {#if post.data.tags && post.data.tags.length > 0}
          <ul class="tag-list">
            {#each post.data.tags.slice(0, 3) as tag}
              <li class="tag"><a href={`/blog/tags/${tagSlug(tag)}`} set:html={renderInlineMarkdown(tag)} /></li>
            {/each}
            {#if post.data.tags.length > 3}
              <li class="tag tag-more" title={post.data.tags.slice(3).map(stripMarkdown).join(', ')}>+{post.data.tags.length - 3}</li>
            {/if}
          </ul>
        {/if} -->
      </div>
      <!-- {#if post.data.cover}
        <figure class="post-cover">
          <Image src={post.data.cover} alt={post.data.coverCaption ? stripMarkdown(post.data.coverCaption) : `Cover art for ${stripMarkdown(post.data.title)}`} width={560} />
          {#if post.data.coverCaption}
            <figcaption class="mono-label" set:html={renderInlineMarkdown(post.data.coverCaption)} />
          {/if}
        </figure>
      {/if} -->
    </li>
  {/each}
</ul>

<!-- {drafts.count > 0 && (
        <span class="mono-label drafts-note">
        {drafts.count} {drafts.count === 1 ? 'draft' : 'drafts'} in progress
        </span>
    )} -->

<style>
  .post-list {
    list-style: none;
    padding: 0;
    margin-top: 0;
  }
  .post-list > li {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-3);
    padding: 2rem 0;
    border-bottom: 1px solid var(--color-hairline);
  }
  .post-list a:hover {
    color: var(--color-highlight-bright);
  }
  .post-date {
    display: block;
    margin-top: 0.3rem;
  }
  .post-desc {
    color: var(--color-text-dim);
    margin-top: 0.4rem;
  }

  .draft-badge {
    color: var(--color-highlight-bright);
    border: 1px dashed var(--color-highlight-bright);
    padding: 0.1rem 0.4rem;
    margin-left: 0.5rem;
    transition:
      background-color 0.15s ease,
      color 0.15s ease;
  }
  .draft-badge:hover {
    background: var(--color-highlight-bright);
    color: var(--color-bg);
  }
  /* }
    .post-main { flex: 1; min-width: 0; }

    .post-cover {
        flex-shrink: 0;
        width: 240px;
        margin: 0;
    }
    .post-cover img {
        width: 100%;
        height: 160px;
        object-fit: cover;
        display: block;
        border: 1px solid var(--color-hairline);
    }
    .post-cover figcaption {
        margin-top: 0.35rem;
        text-transform: none;
        letter-spacing: 0.04em;
    } */
</style>
