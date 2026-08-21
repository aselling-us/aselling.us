import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),

  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.date(),
      description: z.string().optional(),
      draft: z.boolean().optional().default(false),
      tags: z.array(z.string()).optional(),
      // art/photo shown beside the post in the list, e.g. cover: ./my-post-cover.jpg
      cover: image().optional(),
      coverCaption: z.string().optional(),
    }),
});

// One markdown file per place for the concerts/shows/travels map.
// Give each entry either a `location` string (geocoded at build time)
// or explicit `coords: [lat, lng]`. Photos live next to the .md file
// and are referenced with relative paths in `images`.
const places = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/places' }),

  schema: ({ image }) =>
    z
      .object({
        name: z.string(),
        kind: z.enum(['event', 'travel', 'lived', 'want-to-go', 'third-place']),
        location: z.string().optional(),
        coords: z.tuple([z.number(), z.number()]).optional(),
        date: z.string().optional(),
        detail: z.string().optional(),
        images: z.array(image()).optional().default([]),
      })
      .refine((p) => p.location || p.coords, {
        message: 'A place needs either `location` (geocoded at build) or `coords: [lat, lng]`.',
      }),
});

// One markdown file per job/role for the career history on /working.
// startDate/endDate are `YYYY-MM` strings so entries sort as plain text;
// omit endDate for a role that's still current. The markdown body is the
// role's description — short paragraph or a bulleted list of highlights.
const career = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/career' }),

  schema: ({ image }) =>
    z.object({
      role: z.string(),
      company: z.string(),
      companyUrl: z.string().url().optional(),
      location: z.string().optional(),
      startDate: z.string(),
      endDate: z.string().optional(),
      tags: z.array(z.string()).optional(),
      // small square company mark shown beside the entry, e.g. logo: ./acme.png
      logo: image().optional(),
    }),
});

// One markdown file per note about an in-progress personal project, shown
// on /projects above the GitHub-imported sections. Manually authored —
// unlike the repos below it, these aren't pulled from any API. `images` is
// an ordered list of photos dropped next to the .md file (see the dev-only
// editor in scripts/dev-edit-doing.mjs, which owns that field).
const doing = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/doing' }),

  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.date(),
      images: z.array(image()).optional().default([]),
    }),
});

// One markdown file per photo of a physical book — shelf photos, annotated
// pages, marginalia. Shown on /books between "currently reading" and
// "read". Manually authored, not pulled from Goodreads. One photo per
// entry; `caption` is just enough to identify the book, not an excerpt
// (see the dev-only editor in scripts/dev-edit-marginalia.mjs, which owns
// the `image` field). `image` is optional in the schema — same reason
// blog's `cover` and career's `logo` are — the entry is created before the
// photo finishes uploading, so a build must survive a photo that never
// made it; entries with no image just aren't rendered. `order` is the
// carousel's display sequence (ascending) — independent of `date`, since
// the whole point is to let it be rearranged by hand rather than always
// falling out of chronological order; a new entry gets the next integer
// after the current max, and the "move" buttons swap adjacent values.
const marginalia = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/marginalia' }),

  schema: ({ image }) =>
    z.object({
      date: z.date(),
      caption: z.string().optional(),
      image: image().optional(),
      order: z.number(),
    }),
});

export const collections = { blog, places, career, doing, marginalia };