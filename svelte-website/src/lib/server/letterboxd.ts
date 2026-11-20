import { XMLParser } from "fast-xml-parser";
import fs from "node:fs/promises";
import path from "node:path";
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
}

export interface FavoriteFilm {
  fullName: string;
  title: string;
  year: number;
  link: string;
  posterUrl: string;
  slug: string | null;
}

export interface LetterboxdData {
  fetchedAt: string;
  username: string;
  films: DiaryFilm[];
  favorites: FavoriteFilm[];
}

// 1. Prefer real system Chrome (bypasses Letterboxd Cloudflare), fall back to bundled Chromium
async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome" });
  } catch {
    return await chromium.launch();
  }
}

// 2. Fetch recent diary entries from RSS
// FIXME future improvement: fetch director of film to share director of film
async function fetchDiary(): Promise<DiaryFilm[]> {
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
  const items = (parsed?.rss?.channel?.item ?? []) as Array<Record<string, any>>;

  return items
    .filter((item) => Boolean(item["letterboxd:watchedDate"]))
    .map((item): DiaryFilm => {
      const poster =
        typeof item.description === "string"
          ? (item.description.match(/<img src="([^"]+)"/)?.[1] ?? "")
          : "";

      return {
        title: String(item["letterboxd:filmTitle"] ?? ""),
        year: Number(item["letterboxd:filmYear"] ?? 0),
        link: String(item.link ?? ""),
        poster,
        liked: item["letterboxd:memberLike"] === "Yes",
        rewatch: item["letterboxd:rewatch"] === "Yes",
        watchedDate: String(item["letterboxd:watchedDate"] ?? ""),
      };
    });
}

// 3. Scrape Four Favorites using system Chrome
export async function fetchFavorites(): Promise<FavoriteFilm[]> {
  const browser = await launchBrowser();
  try {
    const context = await browser.newContext({
      userAgent: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 aselling.us media snapshot (${process.env.EMAIL ?? ""})`,
    });
    const page = await context.newPage();

    await page.goto(`https://letterboxd.com/${LETTERBOXD_USER}/`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector("#favourites .favourite-production-poster-container", {
      timeout: 10000,
    });

    // Scroll into view so Letterboxd swaps empty-poster for the real resized image
    await page.locator("#favourites").scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () => {
        const imgs = document.querySelectorAll(
          "#favourites .favourite-production-poster-container img",
        );
        return (
          imgs.length > 0 &&
          Array.from(imgs).every((img) => {
            const src = img.getAttribute("src") || img.getAttribute("data-src") || "";
            return src.includes("/resized/") && !src.includes("empty-poster");
          })
        );
      },
      { timeout: 10000 },
    );

    return await page.$$eval(
      "#favourites .favourite-production-poster-container",
      (nodes) =>
        nodes.map((node) => {
          const rc = node.querySelector(".react-component");
          const img = node.querySelector("img");

          const fullName = rc?.getAttribute("data-item-full-display-name") ?? "";
          const yearMatch = fullName.match(/\((\d{4})\)$/);
          const year = Number(rc?.getAttribute("data-item-release-year") || yearMatch?.[1] || 0);
          const title =
            rc?.getAttribute("data-item-name")?.replace(/\s*\(\d{4}\)$/, "") ||
            fullName.replace(/\s*\(\d{4}\)$/, "");

          const srcset = img?.getAttribute("srcset") || img?.getAttribute("data-srcset");
          const highResPoster = srcset ? srcset.split(",").pop()?.trim().split(" ")[0] : null;
          const fallbackSrc =
            img?.getAttribute("data-src") || img?.currentSrc || img?.getAttribute("src") || "";

          return {
            fullName,
            title,
            year,
            link: `https://letterboxd.com${rc?.getAttribute("data-item-link") ?? ""}`,
            posterUrl: highResPoster || fallbackSrc,
            slug: rc?.getAttribute("data-item-slug") ?? null,
          };
        }),
    );
  } finally {
    await browser.close();
  }
}

// 4. Write snapshot only when films or favorites actually changed
export async function writeLetterboxdJson() {
  const [films, favorites] = await Promise.all([fetchDiary(), fetchFavorites()]);

  let previous: LetterboxdData | null = null;
  try {
    previous = JSON.parse(await fs.readFile(OUTPUT_PATH, "utf8"));
  } catch {}

  const nextData: LetterboxdData = {
    fetchedAt: new Date().toISOString(),
    username: LETTERBOXD_USER,
    films,
    // Keep previous favorites if a single scrape came back empty
    favorites: favorites.length > 0 ? favorites : (previous?.favorites ?? []),
  };

  const unchanged =
    previous &&
    JSON.stringify({ ...previous, fetchedAt: null }) ===
      JSON.stringify({ ...nextData, fetchedAt: null });

  if (unchanged) {
    console.log(`letterboxd.json: unchanged (last update ${previous?.fetchedAt})`);
    return;
  }

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(nextData, null, 2) + "\n", "utf8");
  console.log(`letterboxd.json: updated (${nextData.fetchedAt})`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await writeLetterboxdJson();
}
