import matter from "gray-matter";

const LOGO_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "avif", "svg"];

export interface CareerRole {
  slug: string;
  role: string;
  company: string;
  companyUrl?: string;
  location?: string;
  startDate: Date;
  endDate?: Date;
  tags: string[];
  logo?: string;
  content: string;
}

const files = import.meta.glob<string>("/src/content/career/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

const images = import.meta.glob<string>(
  "/src/content/career/*.{png,jpg,jpeg,webp,avif,svg,PNG,JPG,JPEG,WEBP,AVIF,SVG}",
  { eager: true, query: "?url", import: "default" },
);

// "/src/content/career/redwire-logo.png" -> lowercase key "redwire-logo.png"
const imageByName = new Map(
  Object.entries(images).map(([p, url]) => [
    p.split("/").pop()!.toLowerCase(),
    url,
  ]),
);

function findLogo(slug: string): string | undefined {
  for (const ext of LOGO_EXTENSIONS) {
    const hit = imageByName.get(`${slug}-logo.${ext}`);
    if (hit) return hit;
  }
}

export function getCareerCollection(): CareerRole[] {
  return Object.entries(files)
    .map(([path, raw]) => {
      const { data, content } = matter(raw);
      const slug = path.split("/").pop()!.replace(/\.md$/, "");
      return {
        slug,
        role: data.role,
        company: data.company,
        companyUrl: data.companyUrl,
        location: data.location,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        tags: data.tags ?? [],
        logo: findLogo(slug),
        content,
      };
    })
    .sort((a, b) => b.startDate.valueOf() - a.startDate.valueOf());
}