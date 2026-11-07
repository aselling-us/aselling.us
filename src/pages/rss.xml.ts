import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import hardcover from '../data/hardcover.json';
import letterboxd from '../data/letterboxd.json';
import { parsePlaceDate } from '../lib/place-date';
import { bookEntries, buildFeed, filmEntries, placeEntries } from '../../scripts/build-rss-feed.mjs';

// per section — the feed shouldn't re-publish the whole read shelf
const LIMIT = 10;

export async function GET(context: APIContext) {
  const site = context.site!.href;
  const now = Date.now();

  const places = (await getCollection('places')).map((entry) => ({
    id: entry.id,
    name: entry.data.name,
    kind: entry.data.kind,
    date: entry.data.date,
    sortDate: entry.data.date ? parsePlaceDate(entry.data.date) : null,
    detail: entry.data.detail,
    body: entry.body,
  }));

  const xml = buildFeed({
    site,
    email: process.env.EMAIL,
    entries: [
      ...bookEntries(hardcover, { limit: LIMIT }),
      ...filmEntries(letterboxd.films, { limit: LIMIT }),
      ...placeEntries(places, { site, now, limit: LIMIT }),
    ],
  });

  return new Response(xml, {
    headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' },
  });
}
