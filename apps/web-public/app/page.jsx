import { ArticleList } from "../components/article-list";
import { BlogShell } from "../components/blog-shell";
import { fetchCategories, fetchPublicArticles, fetchSidebarBlocks, fetchSiteSettings, fetchTags } from "../lib/api";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }) {
  const resolvedSearchParams = (await searchParams) || {};
  const category = resolvedSearchParams?.category || "all";
  const tag = resolvedSearchParams?.tag || "";
  const search = resolvedSearchParams?.search || "";

  const [articlesResponse, categories, tags, sidebarBlocks, siteSettings] = await Promise.all([
    fetchPublicArticles({
      category: category !== "all" ? category : undefined,
      tag: tag || undefined,
      search: search || undefined,
    }),
    fetchCategories(),
    fetchTags(),
    fetchSidebarBlocks(),
    fetchSiteSettings(),
  ]);

  return (
    <BlogShell
      categories={categories}
      tags={tags}
      currentCategory={category}
      currentTag={tag}
      currentSearch={search}
      siteSettings={siteSettings}
      leftBlocks={sidebarBlocks.left}
      rightBlocks={sidebarBlocks.right}
      bottomBlocks={sidebarBlocks.bottom}
    >
      <ArticleList
        items={articlesResponse.items}
        emptyMessage={search ? "没有找到匹配的文章。" : "当前筛选下还没有文章。"}
      />
    </BlogShell>
  );
}
