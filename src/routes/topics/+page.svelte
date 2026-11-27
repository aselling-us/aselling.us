<script lang="ts">
  import type { PageData } from "./$types";
  import type { Post } from "#lib/types.ts";
  import { slugify } from "#lib/slugify.ts";
  let { data }: { data: PageData } = $props();
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
</script>

<h2 class="mono-label section-label topics-list">
  <!-- <span>posts / {String(posts.length).padStart(2, '0')}</span> -->
  <span>tags / {tags.length} tags</span>
</h2>
{#if tags.length > 0}
  <p class="topic-para">
    {#each tags as tag, i (tag)}
      <a class="tag" href="/topics/{slugify(tag)}">{tag}</a
      >{#if i < tags.length - 1},
      {/if}
    {/each}
  </p>{/if}

<style>
  .topics-list {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--color-hairline);
  }
  .topic-para a {
    padding-left: 8px;
    text-decoration: underline;
    font-family: var(--font-mono);
  }
</style>
