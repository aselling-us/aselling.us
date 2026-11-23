import type { APIContext } from "astro";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { getCollection, render } from "astro:content";
import { remark } from "remark";
import strip from "strip-markdown";
import hardcover from "../data/hardcover.json";
import letterboxd from "../data/letterboxd.json";
import { parsePlaceDate } from "../lib/place-date";
import {
  blogEntries,
  bookEntries,
  buildFeed,
  filmEntries,
  placeEntries,
} from "../../scripts/build-rss-feed.mjs";
const LIMIT = 10;

export async function GET(context: APIContext) {
  const site = context.site!.href;
  const now = Date.now();

  const places = (await getCollection("places")).map((entry) => ({
    id: entry.id,
    name: entry.data.name,
    kind: entry.data.kind,
    date: entry.data.date,
    sortDate: entry.data.date ? parsePlaceDate(entry.data.date) : null,
    detail: entry.data.detail,
    body: entry.body,
  }));

  const plain = async (md = "") => String(await remark().use(strip).process(md)).trim();
  const absolutize = (html: string) => html.replace(/(\s(?:src|href))="\/(?!\/)/g, `$1="${site}`);
  const container = await AstroContainer.create();

  const recentPosts = (await getCollection("blog"))
    .filter((entry) => !entry.data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
    .slice(0, LIMIT);

  const posts = await Promise.all(
    recentPosts.map(async (entry) => {
      const { Content } = await render(entry);
      return {
        id: entry.id,
        title: await plain(entry.data.title),
        date: entry.data.date,
        description: await plain(entry.data.description),
        tags: await Promise.all((entry.data.tags ?? []).map(plain)),
        draft: entry.data.draft,
        content: absolutize(await container.renderToString(Content)),
      };
    }),
  );

  const xml = buildFeed({
    site,
    email: process.env.EMAIL,
    entries: [
      ...bookEntries(hardcover, { limit: LIMIT }),
      ...filmEntries(letterboxd.films, { limit: LIMIT }),
      ...placeEntries(places, { site, now, limit: LIMIT }),
      ...blogEntries(posts, { site, limit: LIMIT }),
    ],
  });

  return new Response(xml, {
    headers: { "Content-Type": "application/atom+xml; charset=utf-8" },
  });
}
