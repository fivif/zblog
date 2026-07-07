import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ErrorNotice } from "../components/Notice";
import { api } from "../lib/api";
import { categoryDisplayName } from "../lib/category-tree";
import { compactCount, formatDisplayDate, statusLabel } from "../lib/format";

export function ArticleListPage({ categories }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ search: "", category: "", status: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadArticles() {
    setLoading(true);
    try {
      setError("");
      const data = await api.listArticles(filters);
      setItems(data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadArticles();
  }, [filters.search, filters.category, filters.status]);

  const stats = useMemo(
    () => [
      { label: "全部", value: items.length },
      { label: "已发布", value: compactCount(items, "published") },
      { label: "草稿", value: compactCount(items, "draft") },
      { label: "已归档", value: compactCount(items, "archived") },
    ],
    [items],
  );

  async function deleteArticle(article) {
    if (!window.confirm("确定删除《" + article.title + "》？对应正文文件也会移除。")) return;
    try {
      await api.deleteArticle(article.id);
      await loadArticles();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="workspace-stack">
      <header className="page-heading">
        <div>
          <p className="section-kicker">内容清单</p>
          <h1>文章管理</h1>
          <p>筛选、编辑、发布和删除文章；前台只展示已发布文章。</p>
        </div>
        <button type="button" onClick={() => navigate("/articles/new")}>
          新建文章
        </button>
      </header>

      <div className="stat-grid">
        {stats.map((item) => (
          <article key={item.label} className="stat-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </div>

      <div className="panel filters-grid">
        <input
          placeholder="搜索标题"
          value={filters.search}
          onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
        />
        <select
          value={filters.category}
          onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
        >
          <option value="">全部分类</option>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {categoryDisplayName(category)}
            </option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
        >
          <option value="">全部状态</option>
          <option value="draft">草稿</option>
          <option value="published">已发布</option>
          <option value="archived">已归档</option>
        </select>
      </div>

      <div className="panel article-table">
        <ErrorNotice message={error} />
        {loading ? <p className="muted-text">加载中…</p> : null}
        {!loading && !items.length ? <p className="muted-text">还没有文章。</p> : null}
        {items.map((item) => (
          <article key={item.id} className="article-row">
            <button type="button" className="article-row-main" onClick={() => navigate("/articles/" + item.id)}>
              <span className={"status-dot status-dot--" + item.status} />
              <span>
                <strong>{item.title}</strong>
                <small>{item.summary || "暂无摘要"}</small>
              </span>
            </button>
            <div className="article-row-meta">
              <span>{item.category.name}</span>
              <span>{statusLabel(item.status)}</span>
              <span>{formatDisplayDate(item.updatedAt)}</span>
            </div>
            <div className="button-row compact-actions">
              {item.status === "published" ? (
                <a className="ghost-button" href={"http://127.0.0.1:3000/articles/" + item.slug} target="_blank" rel="noreferrer">
                  预览
                </a>
              ) : null}
              <button type="button" className="ghost-button" onClick={() => navigate("/articles/" + item.id)}>
                编辑
              </button>
              <button type="button" className="ghost-button danger-button" onClick={() => deleteArticle(item)}>
                删除
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
