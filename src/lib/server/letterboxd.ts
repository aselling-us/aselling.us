import { XMLParser } from "fast-xml-parser";
import fs from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const LETTERBOXD_USER = "aselling";
const OUTPUT_PATH = path.resolve("src/lib/data/letterboxd.json");

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
});

export function getMonthLabel(watchedDate?: string): string {
  return watchedDate ? monthFormatter.format(new Date(watchedDate)) : "";
}

export interface DiaryFilm {
  title: string;
  year: number;
  link: string;
  poster: string;
  liked: boolean;
  rewatch: boolean;
  watchedDate: string;
  id: number | null;
  directors: string[] | null;
}

export interface FavoriteFilm {
  fullName: string;
  title: string;
  year: number;
  link: string;
  posterUrl: string;
  slug: string | null;
  id: number | null;
  directors: string[] | null;
}

export interface LetterboxdData {
  fetchedAt: string;
  username: string;
  films: DiaryFilm[];
  favorites: FavoriteFilm[];
}

// Headed by default (Cloudflare blocks headless). HEADLESS=1 opts in.
async function launchBrowser() {
  const opts = {
    headless: process.env.HEADLESS ? true : false,
    ignoreDefaultArgs: ["--enable-automation"],
    args: ["--disable-blink-features=AutomationControlled"],
  };
  try {
    return await chromium.launch({ channel: "chrome", ...opts });
  } catch {
    return await chromium.launch(opts);
  }
}

// Recent diary entries from RSS. Directors are reused from the previous JSON by TMDB id.
async function fetchDiary(
  previous: LetterboxdData | null,
): Promise<DiaryFilm[]> {
  const cachedDirectors = new Map<number, string[]>();
  for (const f of previous?.films ?? []) {
    if (f.id && f.directors && f.directors.length > 0) {
      cachedDirectors.set(f.id, f.directors);
    }
  }

  const res = await fetch(`https://letterboxd.com/${LETTERBOXD_USER}/rss/`, {
    headers: {
      "User-Agent": `aselling.us media snapshot (${process.env.EMAIL ?? ""})`,
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for RSS`);

  const parser = new XMLParser({
    ignoreAttributes: false,
    isArray: (name) => name === "item",
  });

  const parsed = parser.parse(await res.text());
  const items = (parsed?.rss?.channel?.item ?? []) as Array<
    Record<string, any>
  >;

  const films: DiaryFilm[] = [];

  for (const item of items.filter((item) =>
    Boolean(item["letterboxd:watchedDate"]),
  )) {
    const poster =
      typeof item.description === "string"
        ? (item.description.match(/<img src="([^"]+)"/)?.[1] ?? "")
        : "";

    const id = item["tmdb:movieId"] ? Number(item["tmdb:movieId"]) : null;

    let directors: string[] = (id && cachedDirectors.get(id)) || [];
    if (id && directors.length === 0) {
      try {
        directors = await fetchDirectors(id);
      } catch (e) {
        console.warn(
          `directors lookup failed for ${id}:`,
          (e as Error).message,
        );
      }
      // Only throttle after a real TMDB request.
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    films.push({
      title: String(item["letterboxd:filmTitle"] ?? ""),
      year: Number(item["letterboxd:filmYear"] ?? 0),
      link: String(item.link ?? ""),
      poster,
      liked: item["letterboxd:memberLike"] === "Yes",
      rewatch: item["letterboxd:rewatch"] === "Yes",
      watchedDate: String(item["letterboxd:watchedDate"] ?? ""),
      id,
      directors,
    });
  }

  return films;
}

export async function fetchFavorites(): Promise<FavoriteFilm[]> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.goto(`https://letterboxd.com/${LETTERBOXD_USER}/`, {
      waitUntil: "domcontentloaded",
    });

    console.log("Page URL:", page.url());
    console.log("Page title:", await page.title());
    console.log(
      "Page text:",
      (await page.locator("body").innerText()).slice(0, 500),
    );
    const items = page.locator("#favourites [data-item-link]");
    await items.first().waitFor({ state: "attached", timeout: 15_000 });
    // Best-effort: give posters a few seconds, never throw
    await page
      .waitForFunction(
        () => {
          const imgs = [
            ...document.querySelectorAll<HTMLImageElement>("#favourites img"),
          ];
          return (
            imgs.length > 0 && imgs.every((i) => i.src.includes("/resized/"))
          );
        },
        undefined,
        { timeout: 8_000 },
      )
      .catch(() => {});
    return await items.evaluateAll((nodes) =>
      nodes.map((el) => {
        const fullName = el.getAttribute("data-item-full-display-name") ?? "";
        const year = Number(
          el.getAttribute("data-item-release-year") ||
            fullName.match(/\((\d{4})\)$/)?.[1] ||
            0,
        );
        return {
          fullName,
          title: (el.getAttribute("data-item-name") || fullName).replace(
            /\s*\(\d{4}\)$/,
            "",
          ),
          year,
          link: `https://letterboxd.com${
            el.getAttribute("data-item-link") ?? ""
          }`,
          posterUrl: (() => {
            const img = el.querySelector("img");
            const srcset = img?.getAttribute("srcset");
            const high = srcset?.split(",").pop()?.trim().split(" ")[0];
            const src = img?.currentSrc || img?.getAttribute("src") || "";
            return high || (src.includes("/resized/") ? src : "");
          })(),
          slug: el.getAttribute("data-item-slug"),
          id: null,
          directors: null,
        };
      }),
    );
  } finally {
    await browser.close();
  }
}

/** Looks up directors on TMDB (plain fetch + cheerio, no browser). */
async function fetchDirectors(id: number | null): Promise<string[]> {
  if (!id) return [];

  const res = await fetch(`https://www.themoviedb.org/movie/${id}`);
  if (!res.ok) throw new Error(`TMDB returned ${res.status} for movie ${id}`);

  const $ = cheerio.load(await res.text());

  return $("#featured_crew li.profile")
    .filter((_, el) =>
      $(el)
        .find(".character")
        .text()
        .split(",")
        .some((role) => role.trim() === "Director"),
    )
    .map((_, el) => $(el).find("a").first().text().trim())
    .get()
    .filter(Boolean);
}

// Custom posters from the diary page, keyed by film slug.
// Best-effort: returns whatever loaded, never throws on missing posters.
export async function fetchDiaryPosters(): Promise<Map<string, string>> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.goto(`https://letterboxd.com/${LETTERBOXD_USER}/diary/`, {
      waitUntil: "domcontentloaded",
    });

    // console.log("Page URL:", page.url());
    // console.log("Page title:", await page.title());
    // console.log(
    //   "Page text:",
    //   (await page.locator("body").innerText()).slice(0, 500),
    // );
    const items = page.locator("[data-item-slug], [data-film-slug]");
    await items.first().waitFor({ state: "attached", timeout: 15_000 });

    // Posters lazy-load, so scroll the page to trigger them.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 100));
      }
    });

    console.log(
      "Diary poster samples:",
      await items.evaluateAll((nodes) =>
        nodes.slice(0, 5).map((el) => {
          const img =
            el.querySelector("img") ??
            el.closest("tr, li")?.querySelector("img");

          return {
            slug:
              el.getAttribute("data-item-slug") ??
              el.getAttribute("data-film-slug"),
            src: img?.getAttribute("src"),
            srcset: img?.getAttribute("srcset"),
            dataSrc: img?.getAttribute("data-src"),
          };
        }),
      ),
    );
    await page
      .waitForFunction(
        () => {
          const imgs = [
            ...document.querySelectorAll<HTMLImageElement>("img"),
          ].filter((i) => i.closest("[data-item-slug], [data-film-slug]"));
          return (
            imgs.length > 0 && imgs.every((i) => i.src.includes("/resized/"))
          );
        },
        undefined,
        { timeout: 8_000 },
      )
      .catch(() => {});

    const pairs = await items.evaluateAll((nodes) =>
      nodes.flatMap((el) => {
        const slug =
          el.getAttribute("data-item-slug") ??
          el.getAttribute("data-film-slug");
        const img =
          el.querySelector("img") ??
          el.closest("tr, li")?.querySelector("img") ??
          null;
        const src = img?.currentSrc || img?.getAttribute("src") || "";
        if (
          !slug ||
          !src.includes("/resized/") ||
          src.includes("empty-poster")
        ) {
          return [];
        }
        return [[slug, src] as [string, string]];
      }),
    );

    // Request the same 600x900 size the RSS uses.
    const upscale = (url: string) =>
      url.replace(/-0-\d+-0-\d+-crop/, "-0-600-0-900-crop");

    const map = new Map<string, string>();
    for (const [slug, src] of pairs) {
      if (!map.has(slug)) map.set(slug, upscale(src));
    }
    return map;
  } finally {
    await browser.close();
  }
}

/**
 * Combines diary, favorites and custom posters into src/lib/data/letterboxd.json
 */
export async function writeLetterboxdJson() {
  const timeNow = new Date().toLocaleTimeString();
  console.log(timeNow);
  const start: number = performance.now();

  let previous: LetterboxdData | null = null;
  try {
    previous = JSON.parse(await fs.readFile(OUTPUT_PATH, "utf8"));
  } catch {}

  // Sequential on purpose: parallel browsers on letterboxd.com trigger Cloudflare.
  const films = await fetchDiary(previous);

  let favorites: FavoriteFilm[] = [];
  try {
    favorites = await fetchFavorites();
  } catch (e) {
    console.warn(
      "fetchFavorites failed, keeping previous:",
      (e as Error).message,
    );
  }

  let posters = new Map<string, string>();
  try {
    posters = await fetchDiaryPosters();
  } catch (e) {
    console.warn(
      "fetchDiaryPosters failed, using RSS posters:",
      (e as Error).message,
    );
  }
  console.log("custom diary posters found:", posters.size);

  for (const film of films) {
    const slug = film.link.match(/\/film\/([^/]+)/)?.[1];
    const custom = slug ? posters.get(slug) : undefined;
    if (custom) film.poster = custom;
  }

  const nextData: LetterboxdData = {
    fetchedAt: timeNow,
    username: LETTERBOXD_USER,
    films,
    // Keep previous favorites if a scrape came back empty
    favorites: favorites.length > 0 ? favorites : (previous?.favorites ?? []),
  };

  const unchanged =
    previous &&
    JSON.stringify({ ...previous, fetchedAt: null }) ===
      JSON.stringify({ ...nextData, fetchedAt: null });

  if (unchanged) {
    console.log(
      `letterboxd.json: unchanged (last update ${previous?.fetchedAt})`,
    );
    return;
  }

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(
    OUTPUT_PATH,
    JSON.stringify(nextData, null, 2) + "\n",
    "utf8",
  );
  const elapsedSeconds = (performance.now() - start) / 1000;
  console.log(new Date().toLocaleTimeString());
  console.log(`Elapsed time : ${elapsedSeconds}`);
  console.log(`letterboxd.json: updated (${nextData.fetchedAt})`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await writeLetterboxdJson();
}
