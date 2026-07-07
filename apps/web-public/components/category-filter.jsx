"use client";

import Link from "next/link";
import { useState } from "react";

function buildCategoryHref(category, currentTag, currentSearch) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (currentTag) params.set("tag", currentTag);
  if (currentSearch) params.set("search", currentSearch);
  const suffix = params.toString();
  return suffix ? "/?" + suffix : "/";
}

function CategoryNode({ category, currentCategory, currentTag, currentSearch, defaultExpanded }) {
  const hasChildren = Boolean(category.children?.length);
  const isActive = currentCategory === category.slug;
  const childActive = hasChildren && category.children.some(
    (c) => c.slug === currentCategory || c.children?.some((gc) => gc.slug === currentCategory)
  );
  const [expanded, setExpanded] = useState(defaultExpanded || isActive || childActive);

  return (
    <li className="category-tree-node">
      <div className="category-tree-row">
        <Link
          className={"category-tree-link" + (isActive ? " is-active" : "")}
          href={buildCategoryHref(category.slug, currentTag, currentSearch)}
        >
          <span>{category.name}</span>
        </Link>
        {hasChildren ? (
          <button
            type="button"
            className={"category-tree-toggle" + (expanded ? " is-expanded" : "")}
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "折叠子分类" : "展开子分类"}
          />
        ) : null}
      </div>
      {hasChildren && expanded ? (
        <ol className="category-tree-list">
          {category.children.map((child) => (
            <CategoryNode
              key={child.slug}
              category={child}
              currentCategory={currentCategory}
              currentTag={currentTag}
              currentSearch={currentSearch}
            />
          ))}
        </ol>
      ) : null}
    </li>
  );
}

export function CategoryFilter({ categories, currentCategory, currentTag, currentSearch }) {
  const isFiltering = Boolean(currentCategory && currentCategory !== "all");

  return (
    <div>
      <div className="filter-row-title">
        <span>分类</span>
        {isFiltering ? (
          <Link href={buildCategoryHref("", currentTag, currentSearch)}>显示全部</Link>
        ) : null}
      </div>
      <ol className="category-tree-list category-tree-list--root">
        {(categories || []).map((category) => (
          <CategoryNode
            key={category.slug}
            category={category}
            currentCategory={currentCategory}
            currentTag={currentTag}
            currentSearch={currentSearch}
            defaultExpanded={false}
          />
        ))}
      </ol>
    </div>
  );
}
