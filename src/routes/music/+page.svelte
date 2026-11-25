<script lang="ts">
  import { onMount } from "svelte";
  import { Earbuds, ChartNoAxesColumn } from "@lucide/svelte";

  type Song = {
    title: string;
    artist: string;
    album: string;
    albumArt: string | null;
    songUrl: string;
    isPlaying: boolean;
    playedAt: string | null;
    progressMs: number | null;
    durationMs: number | null;
  };

  type Artist = {
    id: string;
    name: string;
    images: { url: string }[];
    external_urls: { spotify: string };
  };

  let song = $state<Song | null>(null);
  let topArtists = $state<Artist[]>([]);
  let loading = $state(true);
  let error = $state(false);
  let imgFailed = $state(false);

  function formatTime(ms: number) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
  }

  async function updateSong() {
    try {
      const response = await fetch("https://aselling-blog-subscribe.aselling.workers.dev/spotify", { cache: "no-store" });
      if (!response.ok) throw new Error("Spotify request failed");

      const data = await response.json();

      if (data.song?.albumArt !== song?.albumArt) {
        imgFailed = false;
      }

      song = data.song;
      elapsedMs = song?.progressMs ?? 0;
      // topArtists = data.topArtists ?? [];
      error = false;
    } catch {
      error = true;
    } finally {
      loading = false;
    }
  }

  async function updateArtists() {
    try {
      const response = await fetch("src/data/spotify-artists.json");
      if (!response.ok) throw new Error("Could not load top artists");

      const data = await response.json();
      topArtists = data.topArtists;
    } catch (error) {
      console.error(error);
    }
  }

  //   SINCE we can t poll spotify every 1 second, we start a timer on our own to use progress bar
  let elapsedMs = $state(0);

  // runs when the page opens
  // The artists load once per page visit; playback checks every minute.
  onMount(() => {
    updateSong();
    updateArtists();

    // SPOTIFY REFREESH: 2 MINUTES
    const spotifyInterval = setInterval(updateSong, 120_000);

    const progressInterval = setInterval(() => {
      if (song?.isPlaying && song.durationMs != null) {
        elapsedMs = Math.min(elapsedMs + 1_000, song.durationMs);
      }
    }, 1_000);

    return () => {
      clearInterval(spotifyInterval);
      clearInterval(progressInterval);
    };
  });
</script>

{#if loading}
  <p>Loading Spotify...</p>
{:else if error}
  <p>Spotify is currently unavailable.</p>
{:else if song}
  <article class="song-card">
    <a
      href={song.songUrl}
      target="_blank"
      rel="noopener noreferrer"
      class="cover-link"
    >
      {#if song.albumArt && !imgFailed}
        <img
          src={song.albumArt}
          alt="Cover of {song.album}"
          onerror={() => (imgFailed = true)}
        />
      {:else}
        <div class="cover-placeholder">No Cover</div>
      {/if}
    </a>

    <div class="details">
      <span class="mono-label status">
        {song.isPlaying ? "now playing" : "most recently played"}
        <Earbuds />
      </span>

      <h2>
        <a href={song.songUrl} target="_blank" rel="noopener noreferrer">
          {song.title}
        </a>
      </h2>

      <p class="artist">{song.artist}</p>
      <p class="album">{song.album}</p>

      {#if song.playedAt}
        <p class="mono-label played-at">
          played {new Date(song.playedAt).toLocaleString()}
        </p>
      {/if}

      {#if song.isPlaying && song.progressMs != null && song.durationMs != null && song.durationMs > 0}
        {@const progress = Math.min(100, (elapsedMs / song.durationMs) * 100)}

        <div
          class="progress"
          role="progressbar"
          aria-label="Song progress"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={Math.round(progress)}
        >
          <div class="progress-scale">
            <div class="progress-fill" style:width="{progress}%"></div>
            <div class="progress-head" style:left="{progress}%"></div>
          </div>

          <div class="progress-meta mono-label">
            <!-- <span>{formatTime(song.progressMs)}</span> -->
            <span>{formatTime(elapsedMs)}</span>
            <span>{formatTime(song.durationMs)}</span>
          </div>
        </div>
      {/if}
    </div>
  </article>
{:else}
  <p>No recent Spotify tracks found.</p>
{/if}
<!-- ===== TOP ARTISTS -->
<h2 class="artists-heading">Top artists of past month <ChartNoAxesColumn /></h2>
<div class="artist-grid">
  {#each topArtists.slice(0, 10) as artist, index (artist.id)}
    <a
      class="artist-card"
      href={artist.external_urls.spotify}
      target="_blank"
      rel="noopener noreferrer"
    >
      {#if artist.images[0]?.url}
        <img
          class="artist-image"
          src={artist.images[0].url}
          alt={artist.name}
        />
      {:else}
        <div class="artist-placeholder">No image</div>
      {/if}

      <div>
        <span class="mono-label artist-rank">#{index + 1}</span>
        <h3>{artist.name}</h3>
      </div>
    </a>
  {/each}
</div>

<style>
  .song-card {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    border: 1px solid #4175b8;
    border-radius: 8px;
    max-width: 500px;
  }

  img,
  .cover-placeholder {
    width: 90px;
    height: 90px;
    border-radius: 4px;
    display: block;
  }

  img {
    object-fit: cover;
  }

  .cover-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #edf2f7;
    color: #718096;
    font-size: 0.75rem;
  }

  .details {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .status {
    margin-bottom: 0.5rem;
    color: var(--color-highlight);
  }

  h2 {
    margin: 0 0 0.25rem;
    font-size: 1.15rem;
  }

  h2 a {
    color: inherit;
    text-decoration: none;
  }

  h2 a:hover {
    text-decoration: underline;
  }

  .artist,
  .album {
    margin: 0 0 0.25rem;
    color: #4a5568;
    font-size: 0.95rem;
  }

  .played-at {
    margin: 0.5rem 0 0;
  }
  .artist-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }
  @media (max-width: 700px) {
    .artist-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  .artist-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border: 1px solid #4175b8;
    border-radius: 8px;
    color: inherit;
    text-decoration: none;
  }

  .artist-card:hover h3 {
    text-decoration: underline;
  }

  .artist-image,
  .artist-placeholder {
    width: 60px;
    height: 60px;
    flex-shrink: 0;
    border-radius: 50%;
  }

  .artist-image {
    object-fit: cover;
  }

  .artist-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #edf2f7;
    color: #718096;
    font-size: 0.7rem;
  }

  .artist-rank {
    color: var(--color-highlight);
  }

  .artist-card h3 {
    margin: 0.25rem 0 0;
    font-size: 0.95rem;
  }
  .progress {
    margin: auto 0;
  }

  .progress-scale {
    position: relative;
    height: 3px;
    background: var(--color-hairline-bright);
  }

  .progress-fill {
    height: 100%;
    background: var(--color-highlight);
  }

  .progress-head {
    position: absolute;
    top: 50%;
    width: 9px;
    height: 9px;
    background: var(--color-bg-elevated);
    border: 1.5px solid var(--color-highlight);
    transform: translate(-50%, -50%) rotate(45deg);
  }

  .progress-meta {
    display: flex;
    justify-content: space-between;
    margin-top: 0.7rem;
  }
  .artists-heading {
    margin-top: 2rem;
  }
</style>
