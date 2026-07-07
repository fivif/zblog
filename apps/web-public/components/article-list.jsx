"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { formatDisplayDate } from "../lib/formatting";

function LikeButton({ articleId, slug, initialCount }) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount || 0);

  useEffect(() => {
    setLiked(localStorage.getItem("liked-" + slug) === "1");
  }, [slug]);

  async function toggleLike(e) {
    e.preventDefault();
    e.stopPropagation();
    if (liked) return;
    try {
      const resp = await fetch((process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000") + "/api/public/articles/" + slug + "/like", { method: "POST" });
      if (resp.ok) {
        const data = await resp.json();
        setCount(data.likeCount);
        setLiked(true);
        localStorage.setItem("liked-" + slug, "1");
      }
    } catch (_) {}
  }

  return (
    <span className={"like-indicator" + (liked ? " is-liked" : "")}>
      <button type="button" onClick={toggleLike} aria-label={liked ? "已点赞" : "点赞"}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>
      <span>{count}</span>
    </span>
  );
}

const SORT_OPTIONS = [
  { key: "date", label: "时间" },
  { key: "views", label: "阅读" },
  { key: "likes", label: "点赞" },
];

export function ArticleList({ items, emptyMessage }) {
  const [sort, setSort] = useState("date");
  const [desc, setDesc] = useState(true);

  const sorted = useMemo(() => {
    const list = [...(items || [])];
    list.sort((a, b) => {
      let va, vb;
      if (sort === "views") { va = a.viewCount || 0; vb = b.viewCount || 0; }
      else if (sort === "likes") { va = a.likeCount || 0; vb = b.likeCount || 0; }
      else { va = new Date(a.publishedAt || a.updatedAt).getTime(); vb = new Date(b.publishedAt || b.updatedAt).getTime(); }
      return desc ? vb - va : va - vb;
    });
    return list;
  }, [items, sort, desc]);

  function toggleSort(key) {
    if (sort === key) { setDesc((v) => !v); } else { setSort(key); setDesc(true); }
  }

  if (!sorted.length) {
    return <div className="empty-card">{emptyMessage}</div>;
  }

  return (
    <div className="article-table-view">
      <div className="table-header">
        <span className="col-title">标题</span>
        <span className="col-stats">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={"sort-btn" + (sort === opt.key ? " is-active" : "")}
              onClick={() => toggleSort(opt.key)}
            >
              {opt.label}
              {sort === opt.key ? `${desc ? " ↓" : " ↑"}` : ""}
            </button>
          ))}
        </span>
      </div>
      {sorted.map((article) => (
        <Link key={article.id} href={"/articles/" + article.slug} className="table-row">
          <span className="col-title">
            <span className="row-title-text">{article.title}</span>
            <span className="row-meta-line">
              <span className="row-category">{article.category.name}</span>
              {article.tags?.length
                ? article.tags.map((tag) => (
                    <span key={tag.slug} className="tag-dot">{'#' + tag.name}</span>
                  ))
                : null}
            </span>
          </span>
          <span className="col-stats">
            <span className="col-stat-item">{article.viewCount || 0} 阅</span>
            <LikeButton articleId={article.id} slug={article.slug} initialCount={article.likeCount} />
            <span className="col-stat-date">{formatDisplayDate(article.publishedAt || article.updatedAt)}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
