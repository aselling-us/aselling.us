<script lang="ts">
  export interface Book {
    id: string | number;
    title: string;
    author: string;
    year: number | null;
    cover: string | null;
    link: string;
    currentPage: number | null;
    totalPages: number | null;
  }

  let { book }: { book: Book } = $props();
  let imgFailed = $state(false);

  let progress = $derived(
    book.currentPage && book.totalPages && book.totalPages > 0
      ? Math.min(100, Math.round((book.currentPage / book.totalPages) * 100))
      : null,
  );
  function handleImageError(event: Event) {
    const img = event.currentTarget as HTMLImageElement;
    console.error(`[BookCard] Failed to load cover for "${book.title}"`, {
      attemptedSrc: img.currentSrc || img.src,
      rawBookCover: book.cover,
      naturalWidth: img.naturalWidth,
    });
    imgFailed = true;
  }
</script>

<article class="book-card">
  <a
    href={book.link}
    target="_blank"
    rel="noopener noreferrer"
    class="cover-link"
  >
    {#if book.cover && !imgFailed}
      <img
        src={book.cover}
        alt="Cover of {book.title}"
        referrerpolicy="no-referrer"
        onerror={handleImageError}
      />
    {:else}
      <div class="cover-placeholder">No Cover</div>
    {/if}
  </a>

  <div class="details">
    <h2>
      <a href={book.link} target="_blank" rel="noopener noreferrer">
        {book.title}
      </a>
    </h2>
    <p class="author">
      by {book.author}
      {#if book.year}
        ({book.year}){/if}
    </p>

    {#if progress !== null}
      <div
        class="progress"
        role="progressbar"
        aria-label={`Reading progress for ${book.title}`}
        aria-valuemin="0"
        aria-valuemax={book.totalPages}
        aria-valuenow={book.currentPage}
        style={`--p: ${progress}`}
      >
        <div class="progress-scale">
          <div class="progress-fill"></div>
          <div class="progress-head">
            <span class="progress-pct">{progress}%</span>
          </div>
        </div>
        <div class="progress-meta">
          <span class="mono-label"
            >page {book.currentPage} / {book.totalPages}</span
          >
        </div>
      </div>
      <!-- <div class="progress-wrapper">
        <div class="progress-text">
          <span>Page {book.currentPage} of {book.totalPages}</span>
          <span>{progress}%</span>
        </div>
        <progress value={book.currentPage} max={book.totalPages}></progress>
      </div> -->
    {/if}
  </div>
</article>

<style>
  .book-card {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    max-width: 500px;
  }

  img,
  .cover-placeholder {
    width: 90px;
    height: 135px;
    border-radius: 4px;
    display: block;
    flex-shrink: 0;
  }

  img {
    object-fit: cover;
  }

  .cover-placeholder {
    background: #edf2f7;
    color: #718096;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
  }

  .details {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  h2 {
    margin: 0 0 0.25rem 0;
    font-size: 1.15rem;
  }

  h2 a {
    text-decoration: none;
    color: inherit;
  }

  h2 a:hover {
    text-decoration: underline;
  }

  .author {
    margin: 0 0 0.5rem 0;
    color: #4a5568;
    font-size: 0.95rem;
  }

  .progress {
    margin-top: 0.3rem;
    padding: 1.25rem 4px 0; /* room for the number above the bar */
  }
  /* 1px baseline with a tick at each end, like a dimension line */
  .progress-scale {
    position: relative;
    height: 3px;
    background: linear-gradient(
        var(--color-hairline-bright),
        var(--color-hairline-bright)
      )
      center / 100% 1px no-repeat;
  }
  .progress-scale::before,
  .progress-scale::after {
    content: "";
    position: absolute;
    top: -3px;
    width: 1px;
    height: 9px;
    background: var(--color-hairline-bright);
  }
  .progress-scale::before {
    left: 0;
  }
  .progress-scale::after {
    right: 0;
  }
  .progress-fill {
    height: 100%;
    width: calc(var(--p) * 1%);
    background: var(--color-highlight-bright);
    animation: progress-grow 0.9s cubic-bezier(0.22, 0.8, 0.3, 1) backwards;
  }
  /* zero-size anchor at the leading edge; the diamond and the number hang off it */
  .progress-head {
    position: absolute;
    top: 50%;
    left: calc(var(--p) * 1%);
    animation: progress-head 0.9s cubic-bezier(0.22, 0.8, 0.3, 1) backwards;
  }
  .progress-head::before {
    content: "";
    position: absolute;
    top: -4.5px;
    left: -4.5px;
    width: 9px;
    height: 9px;
    box-sizing: border-box;
    transform: rotate(45deg);
    background: var(--color-bg-elevated);
    border: 1.5px solid var(--color-highlight-bright);
  }
  /* translateX(-p%) keeps the number inside the bar at both ends */
  .progress-pct {
    position: absolute;
    bottom: 9px;
    left: 0;
    transform: translateX(calc(var(--p) * -1%));
    white-space: nowrap;
    line-height: 1;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    color: var(--color-highlight-bright);
    animation: progress-pct 0.9s cubic-bezier(0.22, 0.8, 0.3, 1) backwards;
  }
  .progress-meta {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-top: 0.7rem;
  }
  @media (prefers-reduced-motion: reduce) {
    .progress-fill,
    .progress-head,
    .progress-pct {
      animation: none;
    }
  }

  @keyframes progress-grow {
    from {
      width: 0;
    }
  }
  @keyframes progress-head {
    from {
      left: 0;
    }
  }
  @keyframes progress-pct {
    from {
      transform: translateX(0);
    }
  }

  .progress {
    margin-top: 0.15rem;
  }
  .progress-track {
    height: 3px;
    background: var(--color-hairline);
  }
  .progress-fill {
    height: 100%;
    background: var(--color-highlight);
  }
  .progress-label {
    display: block;
    margin-top: 0.3rem;
    color: var(--color-text-faint);
  }


</style>
