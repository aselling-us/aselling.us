import matter from "gray-matter";
import type { PageServerLoad } from "./$types";

export interface PostFrontmatter {
  title: string;
  date: string;
  description: string;
  tags?: string[];
  draft?: boolean;
  cover?: string;
  coverCaption?: string;
}

export interface Post extends Omit<PostFrontmatter, "date"> {
  slug: string;
  date: Date;
  tags: string[];
  draft: boolean;
  cover?: string;
  body: string;
}

const files = import.meta.glob<string>("/src/content/blog/**/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
});

const images = import.meta.glob<string>(
  "/src/content/blog/**/*.{jpg,jpeg,png,webp,avif}",
  {
    eager: true,
    query: "?url",
    import: "default",
  }
);

export const load: PageServerLoad = async () => {
  const posts: Post[] = Object.entries(files)
    .map(([path, raw]) => {
      const parsed = matter(raw);
      const data = parsed.data as PostFrontmatter;
      const { content } = parsed;

      const coverPath = data.cover
        ? path.replace(/[^/]+\.md$/, data.cover)
        : undefined;

      return {
        slug: path.split("/").pop()!.replace(".md", ""),
        title: data.title,
        date: new Date(data.date),
        description: data.description,
        tags: data.tags ?? [],
        draft: data.draft ?? false,
        cover: coverPath ? images[coverPath] : undefined,
        coverCaption: data.coverCaption,
        body: content,
      };
    })
    .filter((post) => import.meta.env.DEV || !post.draft)
    .sort((a, b) => b.date.valueOf() - a.date.valueOf());

  return {
    posts,
  };
};
