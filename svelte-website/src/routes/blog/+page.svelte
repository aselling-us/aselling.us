    <script lang="ts">
    import Quote from "#lib/Quote.svelte";

    import { posts } from "#lib/posts.ts";
    // console.log(posts[0])
    </script>

    <h1>Writing</h1>
    <p class="lede">
    A collection of critiques, thoughts, and journaling. Often pulled straight
    from my obsidian vault.
    </p>
    {#if import.meta.env.DEV}
        <button id="new-post" class="dev-btn mono-label" type="button" title="Dev only: writes src/content/blog/<slug>.md">+ new post</button>
    {/if}
    <p>FIXME subscribe form here</p>
    <p>FIXME tags list</p>

    <Quote cite="— Oscar Wilde, The Picture of Dorian Gray">
        Behind every exquisite thing that existed, there was something tragic. Worlds had to be in travail, that the meanest flower might blow...
    </Quote>

    <h2 class="mono-label section-label">
        <!-- <span>posts / {String(posts.length).padStart(2, '0')}</span> -->
        <span>posts / N posts</span>
    </h2>

        <ul class="post-list">
    {#each posts as p}
        <li>{p.title}</li>
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
        border-bottom: 1px solid var(--color-hairline);} 
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
