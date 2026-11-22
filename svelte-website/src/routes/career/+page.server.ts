import { marked, type TokenizerAndRendererExtension } from "marked";
import { getCareerCollection } from "#lib/server/career.js";
import type { PageServerLoad } from "./$types";

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
