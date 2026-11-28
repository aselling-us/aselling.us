<script>
  // @ts-nocheck

  import { navItems } from "#lib/nav-items.ts";

  import { onMount } from "svelte";
  import {LeafletMap, TileLayer, Marker, Circle, Polygon} from 'leaflet';
  import "leaflet/dist/leaflet.css";

  let mapElement;

  onMount(() => {
    let map;
    let destroyed = false;

    async function initMap() {
      const L = await import("leaflet");
      if (destroyed) return;

      map = L.map(mapElement).setView([44.9778, -93.265], 12);

      const marker = new Marker([44.9778, -93.265]).addTo(map);

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
    }

    initMap();

    return () => {
      destroyed = true;
      map?.remove();
    };
  });
</script>

<svelte:head>
  <title>travels · aselling.us</title>
  <meta name="description" content="This page doesn't exist." />
</svelte:head>

<div class="map" bind:this={mapElement}></div>

<style>
  .map {
    height: 500px;
    width: 100%;
  }
  .lede {
    color: var(--color-text-dim);
  }

  .section-label {
    color: var(--color-highlight-bright);
    border-bottom: 1px solid var(--color-hairline);
    padding-bottom: var(--space-1);
    margin: var(--space-5) 0 var(--space-3);
    font-size: 0.7rem;
    font-weight: 400;
    display: block;
  }

  .nf-hero {
    position: relative;
    margin-top: var(--space-3);
    padding: var(--space-4) 0;
    border-top: 1px solid var(--color-hairline);
    border-bottom: 1px solid var(--color-hairline);
    max-width: 48ch;
  }

  .nf-stamp {
    position: absolute;
    top: var(--space-3);
    right: 0;
    color: var(--color-highlight-bright);
    border: 1px dashed var(--color-highlight-bright);
    padding: 0.3rem 0.6rem;
    transform: rotate(6deg);
    opacity: 0.75;
  }

  .nf-num {
    font-family: var(--font-display);
    font-size: clamp(3.5rem, 12vw, 6.5rem);
    line-height: 1;
    letter-spacing: 0.02em;
    color: var(--color-text-faint);
    margin: 0 0 var(--space-2);
  }

  .nf-home {
    display: inline-block;
    margin-top: var(--space-3);
    color: var(--color-highlight-bright);
    border: 1px solid var(--color-highlight-bright);
    border-radius: 9999px;
    padding: 0.35rem 1rem;
    transition:
      background-color 0.15s ease,
      color 0.15s ease;
  }
  .nf-home:hover {
    background: var(--color-highlight-bright);
    color: var(--color-bg);
  }

  .quick-links {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    padding: 0;
    margin: 0;
  }
  .quick-link {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    border: 1px solid var(--color-hairline);
    padding: 0.6rem 1rem;
    min-width: 10rem;
    color: var(--color-text);
    transition:
      border-color 0.15s ease,
      color 0.15s ease;
  }
  .quick-link:hover {
    border-color: var(--color-highlight);
    color: var(--color-highlight-bright);
  }
  .quick-link-n {
    color: var(--color-text-faint);
  }
  .quick-link-label {
    font-family: var(--font-display);
    font-size: 1.05rem;
  }

  @media (max-width: 640px) {
    .nf-stamp {
      position: static;
      display: inline-block;
      margin-bottom: var(--space-2);
      transform: rotate(-2deg);
    }
    .quick-link {
      min-width: 100%;
    }
  }
</style>
