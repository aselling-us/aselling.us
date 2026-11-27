<script lang="ts">
  import type { PageData } from "./$types";
  let { data }: { data: PageData } = $props();
  import { marked } from "marked";
  import { readingTimeLabel } from "#lib/reading-time.mjs";
</script>

<h1 class="h1writing">Posts on {data.slug}</h1>
<h2>
  {data.posts.length} {data.posts.length === 1 ? "entry" : "entries"} on this topic
</h2>
<ul class="post-list">
  {#each data.posts as post}
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


  button {
    padding: 0.5rem 1rem;
    border-radius: 4px;
    border: 1px solid #ccc;
    background: #f5f5f5;
    cursor: pointer;
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
</style>
