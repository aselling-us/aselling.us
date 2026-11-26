<!-- ts -->
<script lang="ts">
  import Quote from "#lib/Quote.svelte";
  import me from "#lib/assets/me.jpg";
  import type { PageData } from "./$types";
  import { marked } from "marked";
  import BookCard from "#lib/components/BookCard.svelte";
  import { Heart } from "@lucide/svelte";
  import { formatDate } from "#lib/date-helper.ts";

  let { data }: { data: PageData } = $props();
  const posts = $derived(data.posts.filter((post) => !post.draft));
  const latestPost = $derived(posts[0]);
  const reading = $derived(data.reading);
  const films = $derived(data.recentFilms);
  const artists = $derived(data.recentArtists);

  const roles = $derived(data.roles.filter((role) => !role.endDate));
  // console.log(JSON.stringify(latestPost, null, 2));
  // can be used like {lastestPost}
</script>

<!-- HTML -->
<h1>Hi, I'm Arjan.</h1>
<figure class="me-figure">
  <img
    src={me}
    alt="Standing on a rock outcrop looking out over Lake Superior in autumn"
    loading="eager"
    class="me-img"
  />
</figure>
<p style="color: var(--color-text-dim); max-width: 60ch;">
  By trade, I'm a software engineer. By necessity, I am an innovator and
  designer. By passion, I am a cinephile and art aesthete.
</p>
<p style="color: var(--color-text-dim); max-width: 60ch;">
  These distinct but meaningful aspects of my life have shaped me into who I am
  today. After 13 years at a Classical Educational School in Minnetonka,
  Minnesota, I committed to continuing my education at California Polytechnic
  State University in San Luis Obispo, CA. My central coast endeavors have left
  me passionate about education, automation, and technological ethics.
</p>
<p style="color: var(--color-text-dim); max-width: 60ch;">
  Presently, I am committed to graduating from Cal Poly with a B.S. in Software
  Engineering in only 3 years. Outside of the classroom, I am often at coffee
  shops, searching for new <a
    href="https://en.wikipedia.org/wiki/Third_place"
    target="_blank"
    rel="noopener noreferrer">third spaces</a
  >, playing billiards, or watching obscure films no one has heard of.
</p>

<Quote cite="— Friedrich Nietzsche">
  Never trust a thought that occurs to you indoors.
</Quote>

<!-- currently section  -->
<hr />
<!-- make sure SOMETHING was fetched -->
{#if latestPost}
  <section class="home-section">
    <h2 class="mono-label section-label">writing / latest post</h2>

    <div class="post-row">
      <div class="post-main">
        <a href="/blog/{latestPost.slug}">{latestPost.title}</a>

        {#if latestPost.description}
          <p>{latestPost.description}</p>
        {/if}

        {#if latestPost.tags}
          <div class="tag-list">
            {#each latestPost.tags as t}
              <span class="tag">{t}<br /> </span>
            {/each}
          </div>
        {/if}
      </div>

      {#if latestPost.cover}
        <figure class="post-cover">
          <img
            src={latestPost.cover}
            alt={latestPost.coverCaption ?? `Cover art for ${latestPost.title}`}
          />

          {#if latestPost.coverCaption}
            <figcaption class="h1writing">
              {@html marked.parseInline(latestPost.coverCaption)}
            </figcaption>
          {/if}
        </figure>
      {/if}
    </div>
  </section>
{/if}
<br />
<div class="currently-grid">
  <section class="home-section">
    <h2 class="mono-label section-label">currently / reading</h2>
    <div class="book-list">
      {#each reading as book (book.hardcoverId)}
        <BookCard
          {book}
          showProgress={false}
          imageWidth={60}
          imageHeight={90}
        />
      {/each}
    </div>
  </section>

  <section class="home-section">
    <h2 class="mono-label section-label">recently / watching</h2>

    <ul class="minimal-list" role="list">
      {#each films as film (film.link + film.watchedDate)}
        <li>
          <a
            href={film.link}
            target="_blank"
            rel="noopener noreferrer"
            class="poster-link"
          >
            {#if film.poster}
              <img
                class="pastimg"
                src={film.poster}
                alt="Poster for {film.title}"
                loading="lazy"
                referrerpolicy="no-referrer"
              />
            {:else}
              <div class="poster-placeholder">No Poster</div>
            {/if}

            {#if film.liked}
              <span class="liked-label" aria-label="Liked">
                <Heart size={18} fill="currentColor" />
              </span>
            {/if}
          </a>

          <div class="film-meta">
            <span class="film-title">{film.title}</span>

            {#if film.year}
              <span class="film-release-year">released {film.year}</span>
            {/if}

            <!-- {#if film.watchedDate}
              <span class="film-log">
                watched {formatDate(film.watchedDate)}
              </span>
            {/if} -->
          </div>
        </li>
      {/each}
    </ul>
  </section>

  <section class="home-section">
    <h2 class="mono-label section-label">currently / listening</h2>

    <ul class="artist-list">
      {#each artists.slice(0, 5) as artist (artist.id)}
        <li>
          {#if artist.images?.[2]}
            <img src={artist.images[2].url} alt="" />
          {/if}
          <h3 class="artist-name">{artist.name}</h3>
        </li>
      {/each}
    </ul>
  </section>

  <section class="home-section">
    <h2 class="mono-label section-label">currently / working</h2>

    <div class="role-list">
      {#each roles as role (role.slug)}
        <div class="role-item">
          {#if role.logo}
            <img class="role-logo" src={role.logo} alt="" />
          {/if}

          <div>
            <span class="role-title">
              <span class="role-name">{role.role}</span> at {role.company}
            </span>
            {#if role.location}
              <span class="role-location">{role.location}</span>
            {/if}
            <span class="role-since">
              since {String(role.startDate.getMonth() + 1).padStart(
                2,
                "0",
              )}-{role.startDate.getFullYear()}
            </span>
          </div>
        </div>
      {/each}
    </div>
  </section>
</div>

<!-- CSS -->
<style>
  @import url("https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Archivo+Black&family=Gentium+Book+Plus&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap");

  :root {
    /* -- color: ground -- */
    --color-bg: #e6ecea;
    --color-bg-elevated: #f0f4f1;
    --color-bg-inset: #dbe6e6;

    /* -- color: line work -- */
    --color-hairline: #1d88f1;
    --color-hairline-bright: #9ab6bc;

    /* -- color: accents -- */
    --color-accent: #6f9bb0;
    --color-accent-bright: #3f6a86;
    --color-highlight: #cf8871;
    --color-highlight-bright: #96513c;

    /* -- color: text -- */
    --color-text: #3d4d4c;
    --color-text-dim: #728583;
    --color-text-faint: #9bb0ac;

    /* -- color: ornaments (vines, chains) -- */
    --color-vine: #7fa06a;
    --color-chain: #b08a5f;

    /* -- color: places map dots (lived/want-to-go/third-place — travel reuses accent) -- */
    --color-dot-lived: #5f9e78;
    --color-dot-want-to-go: #8f6fb0;
    --color-dot-third-place: #c9922f;
    /* fixed across all themes (not redefined per [data-theme] block on purpose) */
    --color-dot-event: #398fa0;

    /* -- type -- */
    --font-display: "Fraunces", Georgia, serif;
    /* h1 only -- h2/h3 and everything else styled off --font-display stay Fraunces */
    --font-h1: "Archivo Black", "Inter", sans-serif;
    --font-body: "Inter", -apple-system, sans-serif;
    --font-mono: "IBM Plex Mono", ui-monospace, monospace;
    /* the .mono-label utility (nav, index markers, section labels, badges,
     quote attributions, etc.) and other small annotation text */
    --font-label: "Gentium Book Plus", Georgia, serif;

    /* -- layout -- */
    --content-width: 780px;
    --wide-width: 1100px;
    --space-1: 0.5rem;
    --space-2: 1rem;
    --space-3: 1.5rem;
    --space-4: 2.5rem;
    --space-5: 4rem;

    /* h1 */
    /* h2,
    h3 {
      font-weight: 500;
      line-height: 1.15;
      color: var(--color-text);
      margin: 0 0 var(--space-2);
    } */

    /* /* h2, */
    h3 {
      font-family: var(--font-display);
    }

    h1 {
      font-family: var(--font-h1);
      font-weight: 400;
      letter-spacing: -0.01em;
      font-size: clamp(1.6rem, 3vw, 2.25rem);
    }
    h2 {
      font-size: clamp(1.15rem, 2vw, 1.45rem);
    }
  }

  .me-img {
    object-fit: cover;
    width: 100%;
    max-width: 380px;
    /* Add a height or aspect-ratio so object-fit: cover works */
    aspect-ratio: 3 / 3.65;
    display: block;
    width: 100%;
    height: auto;
  }
  .me-figure {
    float: right;
    width: clamp(240px, 34vw, 380px);
    margin: 0 0 var(--space-3) var(--space-4);
    border: 1px solid var(--color-hairline);
    padding: 6px;
  }
  .mono-label.section-label {
    font-family: "Sacramento", cursive;
    text-transform: lowercase;
  }
  .post-row {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
  }

  .post-main {
    flex: 1;
    min-width: 0;
  }

  @media (max-width: 640px) {
    .post-row {
      flex-direction: column;
    }

    .post-cover {
      width: 100%;
    }
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
    .post-cover {
      width: 100%;
    }
    .post-cover img {
      height: 180px;
    }
  }

  .post-cover {
    flex-shrink: 0;
    width: 240px;
    margin: 0;
  }
  .post-cover img {
    border: 1px solid var(--color-hairline);
    display: block;
    height: 160px;
    object-fit: cover;
    width: 100%;
  }
  .post-cover figcaption {
    margin-top: 0.35rem;
    text-transform: none;
    letter-spacing: 0.04em;
    font-size: x-small;
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
  .currently-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1.5rem;
  }

  @media (max-width: 800px) {
    .currently-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 500px) {
    .currently-grid {
      grid-template-columns: 1fr;
    }
  }
  .poster-link {
    position: relative;
    display: inline-block;
  }

  .liked-label {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    color: #f87171;
  }

  /* Minimal Film List (adapted from .minimal-list & .book-*) */
  ul.minimal-list {
    list-style: none;
    padding-left: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    /* this centers it within the seciton */
    width: fit-content;
    max-width: 100%;
    margin-inline: auto;
  }

  ul.minimal-list li {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 1rem;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
  }

  .poster-link {
    display: inline-block;
    vertical-align: top;
    margin-right: 0.75rem;
    text-decoration: none;
  }

  .pastimg,
  .poster-placeholder {
    width: 60px;
    height: 90px;
    border-radius: 4px;
    display: inline-block;
    vertical-align: top;
    border: 1px solid var(--color-hairline);
  }

  .pastimg {
    object-fit: cover;
  }

  .poster-placeholder {
    background: #edf2f7;
    color: #718096;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
  }

  .film-meta {
    display: inline-flex;
    flex-direction: column;
    vertical-align: top;
    gap: 0.15rem;
    max-width: calc(100% - 110px);
  }

  .film-title,
  .artist-name {
    font-family: var(--font-writing, Georgia, "Times New Roman", serif);
    font-size: 1.05rem;
    font-weight: 500;
    line-height: 1.3;
  }

  .film-dir {
    font-family: var(--font-sans, system-ui, -apple-system, sans-serif);
    font-size: 0.875rem;
    color: #444;
    font-style: italic;
  }

  .film-release-year {
    font-family: var(--font-sans, system-ui, -apple-system, sans-serif);
    font-size: 0.8rem;
    color: #888;
    font-style: italic;
  }

  .film-log {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    width: fit-content;
    margin-top: 0.25rem;
    padding: 0.15rem 0.45rem;
    border-left: 2px solid #f9b923;
    background: #fafafa;
    font-family: var(
      --font-mono,
      ui-monospace,
      SFMono-Regular,
      Menlo,
      monospace
    );
    font-size: 0.72rem;
    color: #333;
    letter-spacing: 0.02em;
  }

  .log-label {
    text-transform: uppercase;
    font-size: 0.65rem;
    color: #888;
    letter-spacing: 0.06em;
  }
  .book-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .artist-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .artist-list li {
    display: flex;
    align-items: center;
    gap: 1rem;
    min-height: 50px;
  }

  .artist-list img {
    width: 50px;
    height: 50px;
    object-fit: cover;
    border-radius: 4px;
    border: 1px solid var(--color-hairline);
  }
  .role-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .role-item {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .role-logo {
    width: 50px;
    height: 50px;
    object-fit: contain;
    border-radius: 4px;
    flex-shrink: 0;
    border: 1px solid var(--color-hairline);
  }

  .role-title,
  .role-location {
    display: block;
  }

  .role-location {
    color: var(--color-text-dim);
    font-size: 0.85rem;
  }
  .role-name {
    font-family: var(--font-display);
  }
  .role-since {
    display: block;
    color: var(--color-text-dim);
    font-size: 0.85rem;
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
</style>
