<script lang="ts">
  import Quote from "#lib/Quote.svelte";
  import type { PageData } from "./$types";
  import { marked } from "marked";
  import markedFootnote from "marked-footnote";
  import { enhance } from "$app/forms";
  import { readingTimeLabel } from "#lib/reading-time.mjs";

  marked.use(markedFootnote());
  let { data }: { data: PageData } = $props();

  // $derived is to stay in sync with data
  const posts = $derived(
    data.posts.filter((post) => !post.draft || import.meta.env.DEV),
  );

  // Use a reactive reference instead of document.getElementById
  let popover = $state<HTMLElement | null>(null);
</script>

<h1 class="h1writing">Writing</h1>
<h3 class="lede">
  A collection of critiques, thoughts, and journaling. Often pulled straight
  from my obsidian vault.
</h3>

{#if import.meta.env.DEV}
  <button class="dev-btn mono-label" popovertarget="new-post-popover"
    >+ New Post</button
  >

  <!-- Popover Container ('manual' prevents accidental closing when clicking outside) -->
  <div
    id="new-post-popover"
    bind:this={popover}
    popover="manual"
    class="editor-popover"
  >
    <form
      id="post-form"
      method="POST"
      action="?/createPost"
      enctype="multipart/form-data"
      use:enhance={() => {
        return async ({ result, update }) => {
          if (result.type === "success") {
            popover?.hidePopover();
            await update();
          }
        };
      }}
    >
      <div class="popover-header">
        <h2>Create New Post</h2>
        <button
          type="button"
          popovertarget="new-post-popover"
          popovertargetaction="hide"
          aria-label="Close">✕</button
        >
      </div>

      <div class="row">
        <label class="required-label">
          Draft
          <input name="draft" type="checkbox" checked />
        </label>
        <label class="required-label">
          Title
          <input
            type="text"
            name="title"
            placeholder="Post title..."
            required
          />
        </label>
      </div>

      <div class="row">
        <label class="required-label">
          Date
          <input type="date" name="date" required />
        </label>

        <label>
          Cover Image
          <input type="file" name="cover" accept="image/*" />
        </label>
      </div>

      <label>
        Cover Caption
        <input
          type="text"
          name="covercaption"
          placeholder="Where does this image come from?"
        />
      </label>

      <label class="required-label">
        Post Description
        <input type="text" name="description" placeholder="Short summary..." />
      </label>

      <label>
        Tags (comma-separated)
        <input type="text" name="tags" placeholder="tag1, tag2, tag3..." />
      </label>
      <p>
        FIXME I would like an insert images button, bold button, and insert link
        button for ease of access.
      </p>
      <label class="required-label form-body">
        Body (Markdown)
        <textarea
          name="body"
          rows="12"
          placeholder="Write your unformatted markdown here..."
          required></textarea>
      </label>

      <div class="popover-actions">
        <button
          type="button"
          popovertarget="new-post-popover"
          popovertargetaction="hide">Cancel</button
        >
        <button type="submit" class="primary">Save Post</button>
      </div>
    </form>
  </div>
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
  <!-- any instance of @html marked.parse takes the markeddown and converts it to html, then applies html formatting -->
  {#each posts as post}
    <li
      data-tags={JSON.stringify(
        (post.tags ?? []).map((t: any) => t.toLowerCase()),
      )}
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
        {#if post.cover}
          <figure>
            <img
              src={post.cover}
              alt={post.coverCaption ?? `Cover art for ${post.title}`}
              width="720"
            />
            {#if post.coverCaption}<figcaption class="h1writing">
                {@html marked.parseInline(post.coverCaption)}
              </figcaption>{/if}
          </figure>
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
  .h1writing {
    font-family: var(--font-writing);
  }
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

  .editor-popover {
    width: min(650px, 92vw);
    max-height: 90vh;
    padding: 1.5rem;
    border: 1px solid #ccc;
    border-radius: 8px;
    background: #ffffff;
    color: #111;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
  }

  /* Dim the background when the popover is open */
  .editor-popover::backdrop {
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(2px);
  }

  .popover-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .popover-header h2 {
    margin: 0;
    font-size: 1.25rem;
  }

  #post-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  label {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    font-weight: 600;
  }

  input[type="text"],
  input[type="date"],
  textarea {
    flex: 1; /* Stretches the input to fill remaining space in the label */
    min-width: 0; /* Prevents inputs from overflowing grid columns */
    padding: 0.55rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: inherit;
    font-size: 0.95rem;
  }

  /* Monospace font makes plain-text markdown easier to write */
  textarea {
    font-family:
      ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    resize: vertical;
    line-height: 1.5;
  }

  .popover-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }

  button {
    padding: 0.5rem 1rem;
    border-radius: 4px;
    border: 1px solid #ccc;
    background: #f5f5f5;
    cursor: pointer;
  }

  button.primary {
    background: #111;
    color: #fff;
    border-color: #111;
  }
  .required-label::before {
    content: " *";
    color: rgb(185, 23, 23);
    display: inline;
  }
  .form-body {
    padding: 1rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: inherit;
    font-size: 0.95rem;
    width: 100%; /* Fills the width of its parent container */
    min-height: 150px; /* Sets a taller starting height while still allowing expansion */
  }
</style>
