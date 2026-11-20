<script lang="ts">
  import BookCard from "#lib/components/BookCard.svelte";
  import Quote from "#lib/Quote.svelte";
  import type { PageData } from "./$types";
  import { formatDate } from "#lib/date-helper";

  let { data }: { data: PageData } = $props();
  let totalPastCount = $derived(
    data.pastBooksByYear.reduce((sum, b) => sum + b.books.length, 0),
  );
  let selectedYear = $state("");
  $effect(() => {
    selectedYear = data.pastBooksByYear[0]?.year ?? "";
  });
  let currentBucket = $derived(
    data.pastBooksByYear.find((b) => b.year === selectedYear) ?? {
      year: "",
      books: [],
    },
  );
</script>

<!-- html -->
<h1 class="h1writing">Reading</h1>
<h3 class="lede">
  Selection of books I'm reading, have read, or plan to read. Fetched using the
  Hardcover API.
</h3>
<Quote cite="— Albert Camus, A Happy Death">
  You will never be able to experience everything. So, please, do poetical
  justice to your soul and simply experience yourself.
</Quote>

<!-- FIXME from teh margins -->
<h2 class="mono-label section-label">
  currently reading / {String(data.books.length).padStart(2, "0")}
</h2>

<main class="book-list">
  <!-- indexed by book id -->
  {#each data.books as book (book.id)}
    <div class="book-card-box">
      <BookCard {book} />
    </div>
  {/each}

  <h2 class="mono-label section-label">
    previously / {String(totalPastCount).padStart(2, "0")}
  </h2>

  <!-- Year Pagination Controls -->
  <nav class="year-tabs" aria-label="Filter past reads by year">
    {#each data.pastBooksByYear as bucket (bucket.year)}
      <button
        type="button"
        class="year-tab"
        class:active={bucket.year === selectedYear}
        onclick={() => (selectedYear = bucket.year)}
      >
        {bucket.year} 『{bucket.books.length}』
      </button>
    {/each}
  </nav>

  <!-- Active Year Book List -->
  <ul class="minimal-list" role="list">
    <!-- each individual book is defined under here  -->
    {#each currentBucket.books as past (past.id)}
      <li>
        <a
          href={past.link}
          target="_blank"
          rel="noopener noreferrer"
          class="cover-link"
        >
          {#if past.cover}
            <img
              class="pastimg"
              src={past.cover}
              alt="Cover of {past.title}"
              referrerpolicy="no-referrer"
            />
          {:else}
            <div class="cover-placeholder">No Cover</div>
          {/if}
        </a>

        <div class="book-meta">
          <span class="book-title">{past.title}</span>
          {#if past.author}
            <span class="book-author">{past.author}</span>
          {/if}
          {#if past.year}
            <span class="book-year">published {past.year}</span>
          {/if}
          {#if past.readLog.length > 0}
            <span class="book-log">
              <span class="log-label">finished</span>
              {past.readLog.map(formatDate).join(" · ")}
            </span>
          {/if}
        </div>
      </li>
    {/each}
  </ul>
</main>

<!-- css -->
<style>
  .h1writing {
    font-family: var(--font-writing);
  }
  .book-list {
    display: grid;
    gap: 1rem;
  }
  .book-card-box {
    border: 0.5px solid #f9b923;
  }
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

  .cover-link {
    display: inline-block;
    vertical-align: top;
    margin-right: 0.75rem;
    text-decoration: none;
  }

  .pastimg,
  .cover-placeholder {
    width: 90px;
    height: 135px;
    border-radius: 4px;
    display: inline-block;
    vertical-align: top;
  }

  .pastimg {
    object-fit: cover;
  }

  .cover-placeholder {
    background: #edf2f7;
    color: #718096;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
  }

  .book-meta {
    display: inline-flex;
    flex-direction: column;
    vertical-align: top;
    gap: 0.15rem;
    max-width: calc(
      100% - 110px
    ); /* Prevents long titles from wrapping underneath the cover */
  }

  .book-title {
    font-family: var(--font-writing, Georgia, "Times New Roman", serif);
    font-size: 1.05rem;
    font-weight: 500;
    line-height: 1.3;
  }

  .book-author {
    font-family: var(--font-sans, system-ui, -apple-system, sans-serif);
    font-size: 0.875rem;
    color: #444;
  }
  .book-year {
    font-family: var(--font-sans, system-ui, -apple-system, sans-serif);
    font-size: 0.8rem;
    color: #888;
    font-style: italic;
  }

  .book-log {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    width: fit-content;
    margin-top: 0.25rem;
    padding: 0.15rem 0.45rem;
    border-left: 2px solid #f9b923; /* Echoes .book-card-box border */
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
  .year-tab {
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
    font-size: 0.8rem;
    color: #666;
    cursor: pointer;
  }
  .year-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .year-tab {
    background: transparent;
    border: 0.5px solid #ccc;
    border-radius: 4px;
    padding: 0.25rem 0.6rem;
    font-size: 0.85rem;
    color: #666;
    cursor: pointer;
  }

  .year-tab:hover {
    border-color: #888;
    color: #111;
  }

  .year-tab.active {
    border-color: #f9b923;
    color: #111;
    font-weight: 500;
  }
</style>
