import { json } from "@sveltejs/kit";
import {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REFRESH_TOKEN,
} from "$app/env/private";
import type { RequestHandler } from "./$types";

type SpotifyTrack = {
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string }[];
  };
  external_urls: { spotify: string };
  duration_ms: number | null;
};

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

const CACHE_DURATION = 120_000;

let cachedSong: Song | null = null;
let cachedAt = 0;
let retryAt = 0;
let pending: Promise<Song | null> | null = null;

function formatTrack(track: SpotifyTrack) {
  return {
    title: track.name,
    artist: track.artists.map((artist) => artist.name).join(", "),
    album: track.album.name,
    albumArt: track.album.images[0]?.url ?? null,
    songUrl: track.external_urls.spotify,
    durationMs: track.duration_ms,
  };
}

async function checkResponse(response: Response, label: string) {
  if (response.status === 429) {
    const seconds = Number(response.headers.get("Retry-After")) || 60;
    retryAt = Date.now() + seconds * 1_000;
    throw new Error(`${label}: rate limited for ${seconds} seconds`);
  }

  if (!response.ok) {
    throw new Error(`${label}: ${response.status}`);
  }
}

async function getAccessToken(): Promise<string> {
  const credentials = btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`);

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: SPOTIFY_REFRESH_TOKEN,
    }),
  });

  await checkResponse(response, "Spotify token request");

  const data = await response.json();
  return data.access_token;
}

async function fetchSong(): Promise<Song | null> {
  const token = await getAccessToken();
  const headers = { Authorization: `Bearer ${token}` };

  const currentResponse = await fetch(
    "https://api.spotify.com/v1/me/player/currently-playing",
    { headers },
  );

  if (currentResponse.status !== 204) {
    await checkResponse(currentResponse, "Spotify playback request");
    const current = await currentResponse.json();

    if (current.is_playing && current.item?.type === "track") {
      return {
        ...formatTrack(current.item),
        isPlaying: true,
        playedAt: null,
        progressMs: current.progress_ms,
      };
    }
  }

  const recentResponse = await fetch(
    "https://api.spotify.com/v1/me/player/recently-played?limit=1",
    { headers },
  );

  await checkResponse(recentResponse, "Spotify history request");

  const recent = await recentResponse.json();
  const item = recent.items?.[0];

  if (!item) return null;

  return {
    ...formatTrack(item.track),
    isPlaying: false,
    playedAt: item.played_at,
    progressMs: null,
  };
}

export const GET: RequestHandler = async () => {
  try {
    const now = Date.now();

    if (now < retryAt) {
      return json(
        { song: null, error: "Spotify is temporarily rate limited" },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((retryAt - now) / 1_000)),
            "Cache-Control": "no-store",
          },
        },
      );
    }

    if (!cachedAt || now - cachedAt >= CACHE_DURATION) {
      if (!pending) {
        pending = fetchSong()
          .then((song) => {
            cachedSong = song;
            cachedAt = Date.now();
            return song;
          })
          .finally(() => {
            pending = null;
          });
      }

      await pending;
    }

    // Advance a cached playing track to account for time spent in the cache.
    let song = cachedSong;

    if (song?.isPlaying && song.progressMs != null && song.durationMs != null) {
      song = {
        ...song,
        progressMs: Math.min(
          song.progressMs + (Date.now() - cachedAt),
          song.durationMs,
        ),
      };
    }

    return json({ song }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[Spotify]", error);

    if (Date.now() < retryAt) {
      return json(
        { song: null, error: "Spotify is temporarily rate limited" },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((retryAt - Date.now()) / 1_000)),
            "Cache-Control": "no-store",
          },
        },
      );
    }

    return json(
      { song: null, error: "Spotify is unavailable" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
};
