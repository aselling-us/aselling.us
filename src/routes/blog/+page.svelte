<script lang="ts">
  import Quote from "#lib/Quote.svelte";
  import type { PageData } from "./$types";
  // import { unlink } from "node:fs/promises";

  import { marked } from "marked";
  import markedFootnote from "marked-footnote";
  import PostEditor from "../../components/PostEditor.svelte";
  import { readingTimeLabel } from "#lib/reading-time.mjs";
  import type { Post } from "#lib/types.ts"; // or '#lib/types' if using your #lib alias
  import drafts from "../../data/drafts.json";
  import SubscribeForm from "../../components/SubscribeForm.svelte";
  import { dev } from "$app/env";

  import { slugify } from "#lib/slugify.ts";
  marked.use(markedFootnote());
  let { data }: { data: PageData } = $props();

  // $derived is to stay in sync with data
  const posts = $derived(data.posts);

  // set removes duplicates
  const tags = $derived(
    [
      ...new Set(
        posts.flatMap((post: Post) =>
          (post.tags ?? []).map((t) => t.toLowerCase()),
        ),
      ),
    ].sort(),
  );
  // const postsByTag = $derived.by(() => {
  //   const map = new Map<string, Post[]>();
  //   for (const post of posts) {
  //     for (const t of post.tags ?? []) {
  //       const key = t.toLowerCase();
  //       if (!map.has(key)) map.set(key, []);
  //       map.get(key)!.push(post);
  //     }
  //   }
  //   return map;
  // });

  // let activeTag = $state<string>(""); // "" = all

  // const visiblePosts = $derived(
  //   activeTag
  //     ? posts.filter((p: Post) =>
  //         (p.tags ?? []).some((t) => t.toLowerCase() === activeTag),
  //       )
  //     : posts,
  // );
  // Use a reactive reference instead of document.getElementById
  let popover = $state<HTMLElement | null>(null);

  let editingPost = $state<Post | null>(null);

  function openNewPost() {
    editingPost = null;
    popover?.showPopover();
  }

  function openEditPost(post: Post) {
    editingPost = post;
    popover?.showPopover();
  }
</script>

<svelte:head>
  <title>blog | aselling.us</title>
</svelte:head>

<h1 class="h1writing">Writing</h1>
<h3 class="lede">
  A collection of critiques, thoughts, and journaling. Often pulled straight
  from my obsidian vault.
</h3>

<!-- ===== NEW POST BUTTON -->
{#if dev}
  <button class="dev-btn mono-label" onclick={openNewPost}>+ New Post</button>
  <PostEditor bind:popover bind:editingPost />
{/if}

<SubscribeForm />

<!-- <p>FIXME tags list</p> -->

<Quote cite="— Oscar Wilde, The Picture of Dorian Gray">
  Behind every exquisite thing that existed, there was something tragic. Worlds
  had to be in travail, that the meanest flower might blow...
</Quote>

<h2 class="mono-label section-label topics-list">
  <!-- <span>posts / {String(posts.length).padStart(2, '0')}</span> -->
  <span>tags / {tags.length} tags</span>
  <span class="mono-label topics-note">
    <a class="shelf-link" href="/topics">browse all topics →</a>
  </span>
</h2>
{#if tags.length > 0}
  <p class="topic-para">
    {#each tags as tag, i (tag)}
      <a class="tag" href="/topics/{slugify(tag)}">{tag}</a
      >{#if i < tags.length - 1},
      {/if}
    {/each}
  </p>{/if}

<h2 class="mono-label section-label posts-and-drafts">
  <!-- <span>posts / {String(posts.length).padStart(2, '0')}</span> -->
  <span>posts / {posts.length} posts</span>

  <span class="mono-label drafts-note">
    {drafts.count}
    {drafts.count === 1 ? "draft" : "drafts"} in progress
  </span>
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
            {new Date(post.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
            {" · "}
            {readingTimeLabel(post.body)}
            {" · "}
            {#if post.tags?.length}
              <div class="tag-list">
                {#each post.tags as tag}
                  <span class="tag">{tag}<br /> </span>
                {/each}
              </div>
            {/if}
          </span>

          <!-- ONLY MARK DRAFTS IN DEV AND ONLY SHOW EDIT BUTTON  -->
          {#if import.meta.env.DEV}
            {#if post.draft}
              <span class="draft-badge mono-label">draft</span>
            {/if}
            <button
              type="button"
              class="mono-label edit-btn"
              onclick={(e) => {
                e.preventDefault(); // Prevents triggering the parent <a> link
                openEditPost(post);
              }}
            >
              edit
            </button>
          {/if}
        </a>
        {#if post.description}
          <p class="post-desc">{@html marked.parse(post.description)}</p>
        {/if}
      </div>

      {#if post.cover}
        <figure class="post-cover">
          <img
            src={post.cover}
            alt={post.coverCaption ?? `Cover art for ${post.title}`}
            width="560"
          />
          {#if post.coverCaption}
            <figcaption class="h1writing">
              {@html marked.parseInline(post.coverCaption)}
            </figcaption>
          {/if}
        </figure>
      {/if}
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
  }

  @media (max-width: 640px) {
    .post-list > li {
      flex-direction: column;
    }
    .post-cover {
      width: 100%;
    }
    .post-cover img {
      height: 180px;
    }
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
  .post-main {
    flex: 1;
    min-width: 0;
  }

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
    font-size: x-small;
  }

  .posts-and-drafts,
  .topics-list {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--color-hairline);
  }
  .tag-list {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    padding: 0;
    margin: 0.5rem 0 0;
  }
  span.tag {
    display: inline-block;
    font-family: var(--font-mono);
    font-size: 0.65rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-highlight-bright);
    border: 1px solid var(--color-highlight-bright);
    border-radius: 9999px;
    padding: 0.2rem 0.75rem;
    line-height: 1;
    text-decoration: none;
    transition:
      background-color 0.15s ease,
      color 0.15s ease;
  }
  .tag a:hover {
    background: var(--color-highlight-bright);
    color: var(--color-bg);
  }
  .drafts-note,
  .topics-note {
    margin-left: auto;
  }
  .topic-para a {
    padding-left: 8px;
    text-decoration: underline;
    font-family: var(--font-mono);
  }
</style>
