import assert from "node:assert/strict";

import { buildArticlePayload, slugifyInput } from "./article-form.js";

assert.deepEqual(
  buildArticlePayload({
    title: "Title",
    slug: "slug",
    summary: "",
    coverImage: "",
    categorySlug: "ai",
    tagInput: "react, fastapi",
    status: "draft",
    markdown: "# hi",
  }).tagSlugs,
  ["react", "fastapi"],
);
console.log("web-admin article-form test passed");

assert.equal(slugifyInput("Hello FastAPI World"), "hello-fastapi-world");

const fallbackSlugPayload = buildArticlePayload({
  title: "My Post Title",
  slug: "",
  summary: "",
  coverImage: "",
  categorySlug: "ai",
  tagInput: "",
  status: "draft",
  markdown: "# hi",
});

assert.equal(fallbackSlugPayload.slug, "my-post-title");

assert.equal(slugifyInput("纯中文标题"), "post");
