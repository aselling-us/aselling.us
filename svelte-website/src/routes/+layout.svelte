<script>
  import { page } from "$app/state";
  import { navItems } from "../lib/nav-items";
  let { children } = $props();
</script>

<!-- the header enumerating the different places of the website -->
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
</header>

<main
  class="wrap-wide"
  style="padding-top: var(--space-4); padding-bottom: var(--space-5); min-height: 60vh;"
>
  {@render children?.()}
</main>

<footer class="wrap-wide site-footer">
  <span class="mono-label">
    {new Date().toLocaleString("en-US", { month: "short" })}
    {new Date().getFullYear()} — built with Svelte
  </span>
  <a class="mono-label footer-link" href="/rss.xml">rss</a>
</footer>

<style>
  .site-header {
    display: flex;
    justify-content: space-between;
    padding: 1rem 2rem;
    background-color: #f5f5f5;
    border-bottom: 1px solid #ddd;
  }
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
  nav ul {
    display: flex; /* <li> items in a horizontal row */
    list-style: none; /* no bullets */
    margin: 0; /* Removes default outer spacing */
    padding: 0; /* Removes default left indentation */
    gap: 1.5rem; /* Adds even spacing between each link */
  }
  nav a {
    margin-right: 1rem;
    text-decoration: none;
    color: #333;
    font-weight: bold;
  }
</style>
