const HEADING_PATTERN = /<h([1-4])([^>]*)>([\s\S]*?)<\/h\1>/gi;
const ID_ATTR_PATTERN = /\sid=(['"])(.*?)\1/i;
const SAFE_ID_PATTERN = /^[A-Za-z][\w:-]*$/;

function stripTags(input) {
  return input.replace(/<[^>]*>/g, "");
}

function decodeHtmlEntities(input) {
  const named = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };

  return input.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (entity, value) => {
    if (value[0] === "#") {
      const codePoint = value[1]?.toLowerCase() === "x" ? Number.parseInt(value.slice(2), 16) : Number.parseInt(value.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }
    return named[value] ?? entity;
  });
}

function headingText(innerHtml) {
  return decodeHtmlEntities(stripTags(innerHtml)).replace(/\s+/g, " ").trim();
}

function uniqueId(seed, usedIds) {
  let id = seed;
  let suffix = 2;
  while (usedIds.has(id)) {
    id = `${seed}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(id);
  return id;
}

export function buildArticleHtmlWithToc(html) {
  const toc = [];
  const usedIds = new Set();
  let headingIndex = 0;

  const nextHtml = html.replace(HEADING_PATTERN, (match, level, attrs = "", innerHtml) => {
    const text = headingText(innerHtml);
    if (!text) return match;

    headingIndex += 1;
    const existingIdMatch = attrs.match(ID_ATTR_PATTERN);
    const existingId = existingIdMatch?.[2];
    const canUseExistingId = existingId && SAFE_ID_PATTERN.test(existingId) && !usedIds.has(existingId);
    const id = canUseExistingId ? existingId : uniqueId(`section-${headingIndex}`, usedIds);

    if (canUseExistingId) {
      usedIds.add(id);
    }

    toc.push({ id, text, level: Number(level) });

    if (canUseExistingId) return match;
    const attrsWithoutUnsafeId = attrs.replace(ID_ATTR_PATTERN, "");
    return `<h${level}${attrsWithoutUnsafeId} id="${id}">${innerHtml}</h${level}>`;
  });

  return { html: nextHtml, toc };
}
