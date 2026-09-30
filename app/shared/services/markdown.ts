import { Marked } from "marked";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Posts are written by members, so the markdown is untrusted. Raw html in it
// renders as text, and a link or image only keeps a scheme that cannot run
// script.
function isSafeUrl(href: string): boolean {
  return /^(https?:\/\/|\/(?!\/)|#|mailto:)/i.test(href.trim());
}

const md = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    html({ text }) {
      return escapeHtml(text);
    },

    link({ href }) {
      if (!isSafeUrl(href)) {
        return escapeHtml(href);
      }

      return false;
    },

    image({ href, text }) {
      if (!isSafeUrl(href)) {
        return "";
      }

      return `<img src="${escapeHtml(href)}" alt="${escapeHtml(text)}" loading="lazy">`;
    },
  },
});

export function renderMarkdown(source: string): string {
  return md.parse(source, { async: false }) as string;
}

/** Plain text for excerpts, digests and quote previews. */
export function plainText(source: string, max: number = 220): string {
  let text = source
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^>.*$/gm, "")
    .replace(/[*_`#>~]/g, "")
    .replace(/^\s*(\d+\.|-)\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= max) {
    return text;
  }

  return text.slice(0, max - 1).trimEnd() + "…";
}
