import { marked } from "marked";
import { EMAIL } from "$app/env/private";
import { DOMAIN_ROOT } from "$app/env/public";
import { getPosts } from "#lib/server/posts";
import { dataReading, pastReadsByYear } from "#lib/server/hardcover.ts";

import letterboxd from "#lib/data/letterboxd.json";
// @ts-ignore: plain .mjs shared with the GitHub Actions scripts
import {
  blogEntries,
  bookEntries,
  buildFeed,
  filmEntries,
} from "../../../scripts/build-rss-feed.mjs";
import type { RequestHandler } from "./$types";

export const prerender = true; // required for a static (GitHub Pages) build

const LIMIT = 10;

// replaces remark + strip-markdown
const plain = (md = "") =>
  marked
    .parseInline(md, { async: false })
    .replace(/<[^>]*>/g, "")
    .replace(
      /&(amp|lt|gt|quot|#39);/g,
      (m) =>
        ({
          "&amp;": "&",
          "&lt;": "<",
          "&gt;": ">",
          "&quot;": '"',
          "&#39;": "'",
        })[m]!,
    )
    .trim();

export const GET: RequestHandler = async () => {
  const site = `https://${DOMAIN_ROOT}/`;
  const absolutize = (html: string) =>
    html.replace(/(\s(?:src|href))="\/(?!\/)/g, `$1="${site}`);

  // replaces getCollection("blog") + render() + AstroContainer

  // formats data to feed directly into
  const day = (v: unknown) => (typeof v === "string" ? v.slice(0, 10) : undefined);
  const link = (b: any) => `https://hardcover.app/books/${b.slug}`;

  let bookData = { current: [] as any[], read: [] as any[] };
  try {
    const [reading, past] = await Promise.all([
      dataReading(),
      pastReadsByYear(),
    ]);

    bookData.current = reading
      .map((b: any) => ({
        link: link(b),
        title: b.title,
        author: b.author,
        startedAt: day(b.startedAt), // not provided yet, see below
        currentPage: b.elapsedPages,
        totalPages: b.totalPages,
      }))
      .filter((b) => b.startedAt); // undated entries would break the feed

    // one entry per finish date, so a re-read shows up again; the Set removes
    // duplicates if a book appears in more than one year bucket
    const seen = new Set<string>();
    bookData.read = past
      .flatMap((bucket) => bucket.books)
      .flatMap((b: any) =>
        (b.readLog ?? [b.sortDate]).map((d: string) => ({
          link: link(b),
          title: b.title,
          author: b.author,
          readAt: day(d),
        })),
      )
      .filter((b) => {
        if (!b.readAt) return false;
        const key = `${b.link}#${b.readAt}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  } catch (err) {
    console.error("RSS: Hardcover fetch failed, skipping books", err);
  }
  const posts = getPosts()
    .filter((p) => !p.draft)
    .slice(0, LIMIT) // getPosts() is already newest-first
    .map((p) => ({
      id: p.slug,
      title: plain(p.title),
      date: p.date,
      description: plain(p.description),
      tags: p.tags.map(plain),
      draft: p.draft,
      content: absolutize(marked.parse(p.body, { async: false })),
    }));

  const xml = buildFeed({
    site,
    email: EMAIL,
    entries: [
      ...bookEntries(bookData, { limit: LIMIT }),
      ...filmEntries(letterboxd.films, { limit: LIMIT }),
      // placeEntries(...) omitted, see below
      ...blogEntries(posts, { site, limit: LIMIT }),
    ],
  });

  return new Response(xml, {
    headers: { "Content-Type": "application/atom+xml; charset=utf-8" },
  });
};
