export function slugifyInput(value) {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "post";
}

export function buildArticlePayload(form) {
  return {
    title: form.title.trim(),
    slug: slugifyInput(form.slug || form.title),
    summary: form.summary,
    coverImage: form.coverImage,
    categorySlug: form.categorySlug,
    tagSlugs: form.tagInput
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    status: form.status,
    markdown: form.markdown,
  };
}
