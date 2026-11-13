<script lang="ts">
  import "../../styles/global.css";
  import { navItems } from "#lib/nav-items.ts";
  import { page } from "$app/state";
  const year = new Date().getFullYear();

  let { children } = $props();
</script>

<svelte:head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <!-- <link rel="icon" href="/favicon.svg" type="image/svg+xml" /> -->
  <link
    rel="alternate"
    type="application/atom+xml"
    title="Arjan Ellingson"
    href="/rss.xml"
  />
  <!-- FIXME switch between monet and caravaggio -->
</svelte:head>

<header class="site-header">
  <nav aria-label="Primary">
    <!-- fetches routes for header from nav-items.ts -->
    <ul>
      {#each navItems as item}
        {@const active = page.url.pathname === item.href}
        {@const external = /^(https?:)?\/\//.test(item.href)}

        <li>
          <a
            href={item.href}
            class="nav-link"
            class:active
            aria-current={active ? "page" : undefined}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
          >
            <span class="mono-label nav-n">{item.n}</span>
            <span class="nav-label">{item.label}</span>
          </a>
        </li>
      {/each}
    </ul>
  </nav>
  <hr />
</header>
<main
  class="wrap-wide"
  style="padding-top: var(--space-4); padding-bottom: var(--space-5); min-height: 60vh;"
>
  {@render children()}
</main>

<footer class="wrap-wide site-footer">
  <span class="mono-label">{year} — built with Svelte</span>
  <a class="mono-label footer-link" href="/rss.xml">rss</a>
</footer>

<style>
  .site-footer {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: var(--space-3) 0 var(--space-4);
    border-top: 1px solid var(--color-hairline);
  }

  .footer-link {
    color: var(--color-accent-bright);
  }

  .footer-link:hover {
    color: var(--color-highlight-bright);
  }

  .site-header {
    padding: var(--space-3) var(--space-4);
  }

  .site-header ul {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: var(--space-3);
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .nav-link {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }
  hr {
    border: none;
    border-top: 1px solid #d1d5db;
    margin: 1.5rem 0;
  }
</style>
