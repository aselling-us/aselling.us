const CACHE_SECONDS = 120;

function formatTrack(track) {
  return {
    title: track.name,
    artist: track.artists.map((artist) => artist.name).join(", "),
    album: track.album.name,
    albumArt: track.album.images[0]?.url ?? null,
    songUrl: track.external_urls.spotify,
    durationMs: track.duration_ms ?? null,
  };
}

async function spotifyFetch(url, options) {
  const response = await fetch(url, options);

  if (response.status === 429) {
    const seconds = Number(response.headers.get("Retry-After")) || 60;
    const error = new Error("Spotify rate limit reached");
    error.retryAfter = seconds;
    throw error;
  }

  if (!response.ok) {
    throw new Error(`Spotify request failed: ${response.status}`);
  }

  return response;
}

async function fetchSong(env) {
  const credentials = btoa(
    `${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`,
  );

  const tokenResponse = await spotifyFetch(
    "https://accounts.spotify.com/api/token",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: env.SPOTIFY_REFRESH_TOKEN,
      }),
    },
  );

  const { access_token: token } = await tokenResponse.json();
  const headers = { Authorization: `Bearer ${token}` };

  const currentResponse = await spotifyFetch(
    "https://api.spotify.com/v1/me/player/currently-playing",
    { headers },
  );

  if (currentResponse.status !== 204) {
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

  const recentResponse = await spotifyFetch(
    "https://api.spotify.com/v1/me/player/recently-played?limit=1",
    { headers },
  );

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

export async function handleSpotify(request, env, originHeaders) {
  const cache = caches.default;

  // A fixed key lets visitors to this Worker share the same cached result.
  const cacheUrl = new URL("/__spotify_cache", request.url);
  const cacheKey = new Request(cacheUrl.toString());

  const responseHeaders = {
    ...originHeaders,
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };

  try {
    let cached = await cache.match(cacheKey);
    let data;

    if (cached) {
      data = await cached.json();
    } else {
      const song = await fetchSong(env);
      data = { song, fetchedAt: Date.now() };

      await cache.put(
        cacheKey,
        new Response(JSON.stringify(data), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": `public, max-age=${CACHE_SECONDS}`,
          },
        }),
      );
    }

    let { song } = data;

    if (
      song?.isPlaying &&
      song.progressMs != null &&
      song.durationMs != null
    ) {
      song = {
        ...song,
        progressMs: Math.min(
          song.progressMs + Date.now() - data.fetchedAt,
          song.durationMs,
        ),
      };
    }

    return new Response(JSON.stringify({ song }), {
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[Spotify]", error.message);

    return new Response(
      JSON.stringify({ song: null, error: "Spotify is unavailable" }),
      {
        status: error.retryAfter ? 429 : 502,
        headers: {
          ...responseHeaders,
          ...(error.retryAfter
            ? { "Retry-After": String(error.retryAfter) }
            : {}),
        },
      },
    );
  }
}