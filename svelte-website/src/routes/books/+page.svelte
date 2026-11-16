<script lang="ts">
  // import BookCard from "#lib/BookCard.svelte";
  import Quote from "#lib/Quote.svelte";
  import type { PageData } from "./$types";
  // let { data }: { data: PageData } = $props();
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
<!-- <section>
  <h2 class="mono-label section-label">
    currently reading / {String(data.books.length).padStart(2, "0")}
  </h2>

  <ul class="current-list">
    {#each data.books as book (book.id)}
      <BookCard {book} />
    {/each}
  </ul>
</section> -->

<!-- css -->
<style>
  .h1writing {
    font-family: var(--font-writing);
  }
</style>
