const SELF_CLOSING = new Set([
  "br",
  "hr",
  "img",
  "input",
  "area",
  "base",
  "col",
  "embed",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

/**
 * Truncates HTML to `maxTextChars` visible characters, then closes any open
 * tags in reverse order so the result is always valid HTML.
 */
export function truncateHtml(html: string, maxTextChars: number): string {
  let result = "";
  let textCount = 0;
  let i = 0;
  const tagStack: string[] = [];

  while (i < html.length && textCount < maxTextChars) {
    if (html[i] === "<") {
      const end = html.indexOf(">", i);
      if (end === -1) break;

      const tag = html.slice(i, end + 1);
      result += tag;

      const match = tag.match(/^<\/?([a-zA-Z][a-zA-Z0-9]*)/);
      if (match) {
        const name = match[1].toLowerCase();
        if (tag.startsWith("</")) {
          const idx = tagStack.lastIndexOf(name);
          if (idx !== -1) tagStack.splice(idx, 1);
        } else if (!SELF_CLOSING.has(name) && !tag.endsWith("/>")) {
          tagStack.push(name);
        }
      }
      i = end + 1;
    } else {
      result += html[i];
      textCount++;
      i++;
    }
  }

  // Close all open tags in reverse order
  for (let j = tagStack.length - 1; j >= 0; j--) {
    result += `</${tagStack[j]}>`;
  }

  return result;
}
