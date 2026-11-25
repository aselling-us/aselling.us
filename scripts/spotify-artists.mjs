import { mkdir, writeFile } from "node:fs/promises";

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

if (!clientId || !clientSecret || !refreshToken) {
  throw new Error("Missing Spotify environment variables");
}

const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
  "base64",
);

const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
  method: "POST",
  headers: {
    Authorization: `Basic ${credentials}`,
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  }),
});

if (!tokenResponse.ok) {
  throw new Error(`Spotify token request failed: ${tokenResponse.status}`);
}

const { access_token: accessToken } = await tokenResponse.json();

const params = new URLSearchParams({
  time_range: "short_term",
  limit: "10",
});

const artistsResponse = await fetch(
  `https://api.spotify.com/v1/me/top/artists?${params}`,
  {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  },
);

if (!artistsResponse.ok) {
  const retryAfter = artistsResponse.headers.get("Retry-After");
  throw new Error(
    `Spotify artists request failed: ${artistsResponse.status}` +
      (retryAfter ? `; retry after ${retryAfter} seconds` : ""),
  );
}

const data = await artistsResponse.json();

const topArtists = data.items.map((artist) => ({
  id: artist.id,
  name: artist.name,
  images: artist.images,
  external_urls: artist.external_urls,
}));

await mkdir("src/data", { recursive: true });
await writeFile(
  "src/data/spotify-artists.json",
  JSON.stringify({ topArtists }, null, 2),
);

console.log(`Saved ${topArtists.length} top artists.`);
