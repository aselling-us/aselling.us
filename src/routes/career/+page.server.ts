import { marked, type TokenizerAndRendererExtension } from "marked";
import { getCareerCollection } from "#lib/server/career.js";
import type { PageServerLoad } from "./$types";
import { writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fail, error } from "@sveltejs/kit";

import type { Actions } from "./$types";

const CAREER_DIR = "src/content/career";
const LOGO_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "avif", "svg"];

function slugify(input: string) {
  return (
    input
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled"
  );
}
const highlightExtension: TokenizerAndRendererExtension = {
  name: "highlight",
  level: "inline",
  start(src) {
    return src.match(/==/)?.index;
  },
  tokenizer(src) {
    const rule = /^==([^=\n]+)==/;
    const match = rule.exec(src);
    if (match) {
      return {
        type: "highlight",
        raw: match[0],
        text: match[1],
        tokens: this.lexer.inlineTokens(match[1]),
      };
    }
  },
  renderer(token) {
    return `<mark>${this.parser.parseInline(token.tokens!)}</mark>`;
  },
};

marked.use({ extensions: [highlightExtension] });

export const load: PageServerLoad = () => ({
  roles: getCareerCollection().map((r) => ({
    ...r,
    html: marked.parse(r.content, { async: false }),
  })),
});

export const actions: Actions | undefined = import.meta.env.DEV
  ? {
  createRole: async ({ request }) => {
    if (!import.meta.env.DEV) error(403, "Forbidden");

    const fd = await request.formData();
    const role = String(fd.get("role") ?? "").trim();
    const company = String(fd.get("company") ?? "").trim();
    const companyUrl = String(fd.get("companyUrl") ?? "").trim();
    const location = String(fd.get("location") ?? "").trim();
    const startDate = String(fd.get("startDate") ?? "").trim();
    const endDate = String(fd.get("endDate") ?? "").trim();
    const tags = String(fd.get("tags") ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const body = String(fd.get("body") ?? "");
    const logo = fd.get("logo") as File | null;

    if (!role || !company || !startDate) {
      return fail(400, {
        message: "Role, company, and start date are required.",
      });
    }

    const slug = slugify(`${company} ${role}`);
    const mdPath = `${CAREER_DIR}/${slug}.md`;

    // never overwrite an existing role
    const exists = await access(mdPath).then(
      () => true,
      () => false,
    );
    if (exists) return fail(409, { message: `${slug}.md already exists.` });

    try {
      if (logo && logo.size > 0) {
        const ext = path.extname(logo.name).slice(1).toLowerCase();
        if (!LOGO_EXTENSIONS.includes(ext)) {
          return fail(400, { message: `Unsupported logo type: .${ext}` });
        }
        await writeFile(
          `${CAREER_DIR}/${slug}-logo.${ext}`,
          Buffer.from(await logo.arrayBuffer()),
        );
      }

      const frontmatter = [
        "---",
        `role: ${JSON.stringify(role)}`,
        `company: ${JSON.stringify(company)}`,
        companyUrl && `companyUrl: ${JSON.stringify(companyUrl)}`,
        location && `location: ${JSON.stringify(location)}`,
        `startDate: ${startDate}`,
        endDate && `endDate: ${endDate}`,
        `tags: [${tags.map((t) => JSON.stringify(t)).join(", ")}]`,
        "---",
      ]
        .filter(Boolean)
        .join("\n");

      await writeFile(mdPath, `${frontmatter}\n\n${body}\n`, "utf8");
      return { success: true };
    } catch (err) {
      console.error("Error writing role:", err);
      return fail(500, { message: `Failed to write ${slug}.md` });
    }
  },
} : undefined;
