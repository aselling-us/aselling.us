<script lang="ts">
  import Quote from "#lib/Quote.svelte";
  import type { LetterboxdData } from "#lib/server/letterboxd";
  import type { PageData } from "./$types";

  const profileUrl = "https://letterboxd.com";

  let { data }: { data: PageData } = $props();
  const letterboxd = $derived(data.letterboxd as LetterboxdData);
  const { favorites, films, fetchedAt } = $derived(letterboxd);

  let selectedMonth = $state<string>(data.uniqueMonths?.[0] ?? "");
  const filteredFilms = $derived(data.filmsByMonth[selectedMonth] ?? []);
</script>

<h1 class="h1watching">Watching</h1>
<p class="lede">
  Recent entries from my <a
    href={profileUrl}
    target="_blank"
    rel="noopener noreferrer">Letterboxd diary</a
  >.
</p>
<p class="mono-label updated-top">most recent update / {fetchedAt}</p>
<Quote cite="— Robert Grainier, Train Dreams">
  The world needs a hermit in the woods as much as a preacher in a pulpit.
</Quote>

<section class="favorites">
  <h2 class="mono-label section-label">four favorites</h2>
  <ul class="favorites-grid">
    {#each favorites as film (film.link)}
      <li class="favorite">
        <a href={film.link} target="_blank" rel="noopener noreferrer">
          {#if film.posterUrl}
            <img
              class="favorite-poster"
              src={film.posterUrl}
              alt="Poster for {film.title}"
              loading="lazy"
              referrerpolicy="no-referrer"
            />
          {/if}
          <span class="favorite-title">
            {film.title}
            {#if film.year}
              <span class="film-year"> ({film.year})</span>
            {/if}
          </span>
        </a>
      </li>
    {/each}
  </ul>
</section>

<section>
  <h2 class="mono-label section-label">
    diary / last {String(films.length).padStart(2, "0")}
    <a
      class="shelf-link"
      href={profileUrl}
      target="_blank"
      rel="noopener noreferrer">view on Letterboxd →</a
    >
  </h2>

  <!-- Month Pagination Controls -->
  <nav class="month-tabs" aria-label="Filter diary entries by month">
    {#each data.uniqueMonths as bucket (bucket)}
      <button
        type="button"
        class="month-tab"
        class:active={bucket === selectedMonth}
        onclick={() => (selectedMonth = bucket)}
      >
        {bucket} ({data.filmsByMonth[bucket]?.length ?? 0})
      </button>
    {/each}
  </nav>

  <!-- Active Month Film List -->
  <ul class="minimal-list" role="list">
    {#each filteredFilms as film (film.link + film.watchedDate)}
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
        </a>

        <div class="film-meta">
          <span class="film-title">{@html film.title}</span>
          {#if film.rating}
            <span class="film-rating">{film.rating}</span>
          {/if}
          {#if film.year}
            <span class="film-release-year">released {film.year}</span>
          {/if}
          {#if film.watchedDate}
            <span class="film-log">
              <span class="log-label">
                {film.rewatch ? "rewatched" : "watched"}
              </span>
              {film.watchedDate}
            </span>
          {/if}
        </div>
      </li>
    {/each}
  </ul>
</section>

<style>
  .h1watching {
    font-family: var(--font-writing);
  }

  .favorites-grid {
    list-style: none;
    padding: 0;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(4, minmax(160px, 260px));
    gap: var(--space-3);
  }
  @media (max-width: 700px) {
    .favorites-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-2);
    }
  }
  .favorite a {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
  }
  .favorite-poster {
    width: 70%;
    aspect-ratio: 2 / 3;
    object-fit: cover;
    display: block;
    border: 1px solid var(--color-hairline);
  }
  .favorite a:hover .favorite-poster {
    border-color: var(--color-highlight);
  }
  .favorite-title {
    font-family: var(--font-display);
    font-size: 1.05rem;
    line-height: 1.3;
    color: var(--color-text);
  }
  .favorite a:hover .favorite-title {
    color: var(--color-highlight-bright);
  }

  .section-label {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--space-2);
    color: var(--color-highlight-bright);
    border-bottom: 1px solid var(--color-hairline);
    padding-bottom: var(--space-1);
    margin: 0 0 var(--space-3);
    font-size: 0.7rem;
    font-weight: 400;
  }

  section {
    margin-top: var(--space-4);
  }

  /* Month Tabs (adapted from .year-tabs / .year-tab) */
  .month-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .month-tab {
    font-family: var(
      --font-mono,
      ui-monospace,
      SFMono-Regular,
      Menlo,
      monospace
    );
    background: transparent;
    border: 0.5px solid #ccc;
    border-radius: 4px;
    padding: 0.25rem 0.6rem;
    font-size: 0.85rem;
    color: #666;
    cursor: pointer;
  }

  .month-tab:hover {
    border-color: #888;
    color: #111;
  }

  .month-tab.active {
    border-color: #f9b923;
    color: #111;
    font-weight: 500;
  }

  /* Minimal Film List (adapted from .minimal-list & .book-*) */
  ul.minimal-list {
    list-style: none;
    padding-left: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  ul.minimal-list li {
    position: relative;
    padding-left: 1.25rem;
    line-height: 1.5;
  }

  ul.minimal-list li::before {
    content: "·";
    position: absolute;
    left: 0;
    color: #888;
  }

  .poster-link {
    display: inline-block;
    vertical-align: top;
    margin-right: 0.75rem;
    text-decoration: none;
  }

  .pastimg,
  .poster-placeholder {
    width: 90px;
    height: 135px;
    border-radius: 4px;
    display: inline-block;
    vertical-align: top;
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

  .film-title {
    font-family: var(--font-writing, Georgia, "Times New Roman", serif);
    font-size: 1.05rem;
    font-weight: 500;
    line-height: 1.3;
  }

  .film-rating {
    font-family: var(--font-sans, system-ui, -apple-system, sans-serif);
    font-size: 0.875rem;
    color: #444;
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
</style>
