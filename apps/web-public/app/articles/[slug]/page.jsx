import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticleBody } from "../../../components/article-body";
import { ArticleToc } from "../../../components/article-toc";
import { BlogShell } from "../../../components/blog-shell";
import { ViewTracker } from "../../../components/view-tracker";
import { fetchArticle, fetchCategories, fetchSidebarBlocks, fetchSiteSettings, fetchTags } from "../../../lib/api";
import { buildArticleHtmlWithToc } from "../../../lib/article-toc";
import { formatDisplayDate } from "../../../lib/formatting";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const [article, siteSettings] = await Promise.all([
    fetchArticle(resolvedParams.slug),
    fetchSiteSettings(),
  ]);
  if (!article) {
    return { title: "文章不存在" };
  }
  return {
    title: article.title + " · " + siteSettings.siteTitle,
    description: article.summary || siteSettings.siteSubtitle || "个人博客文章",
  };
}

export default async function ArticlePage({ params }) {
  const resolvedParams = await params;
  const [article, categories, tags, sidebarBlocks, siteSettings] = await Promise.all([
    fetchArticle(resolvedParams.slug),
    fetchCategories(),
    fetchTags(),
    fetchSidebarBlocks(),
    fetchSiteSettings(),
  ]);

  if (!article) notFound();

  const articleContent = buildArticleHtmlWithToc(article.html);

  return (
    <BlogShell
      categories={categories}
      tags={tags}
      currentCategory={article.category.slug}
      currentTag=""
      siteSettings={siteSettings}
      showFilters={false}
      leftAddon={<ArticleToc items={articleContent.toc} />}
      leftBlocks={sidebarBlocks.left}
      rightBlocks={sidebarBlocks.right}
      bottomBlocks={sidebarBlocks.bottom}
    >
      <article className="article-panel">
        <header className="article-hero">
          <div className="article-title-stack">
            <p className="kicker-line">{article.category.name}</p>
            <h1>{article.title}</h1>
            {article.summary ? <p className="article-summary">{article.summary}</p> : null}
          </div>

          <div className="tag-row">
            {article.tags.map((item) => (
              <Link key={item.slug} className="tag-pill" href={"/?tag=" + item.slug}>
                {'#' + item.name}
              </Link>
            ))}
          </div>

          {article.coverImage ? (
            <img className="article-cover" src={article.coverImage} alt="" loading="lazy" />
          ) : null}
        </header>

        <ArticleBody html={articleContent.html} />
      </article>
      <ViewTracker slug={resolvedParams.slug} />
    </BlogShell>
  );
}
