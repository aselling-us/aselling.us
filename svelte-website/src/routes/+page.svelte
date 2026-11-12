<!-- ts -->
<script lang="ts">
  import Quote from "#lib/Quote.svelte";

//   function greet() {
//     alert("Welcome to Svelte!");
//   }
</script>

<!-- HTML -->
<h1>Hi, I'm Arjan.</h1>

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

    h1,
    h2,
    h3 {
      font-weight: 500;
      line-height: 1.15;
      color: var(--color-text);
      margin: 0 0 var(--space-2);
    }

    h2,
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
    h3 {
      font-size: 1.1rem;
    }
  }
</style>
