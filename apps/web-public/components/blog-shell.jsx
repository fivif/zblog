"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CategoryFilter } from "./category-filter";
import { SearchBox } from "./search-box";
import { SidebarRegion } from "./sidebar-region";
import { TagCloud } from "./tag-cloud";
import { ThemeToggle } from "./theme-toggle";

export function BlogShell({
  categories,
  tags,
  currentCategory,
  currentTag,
  currentSearch,
  siteSettings,
  leftAddon,
  leftBlocks,
  showFilters = true,
  rightBlocks,
  bottomBlocks,
  children,
}) {
  const hasRightBlocks = Boolean(rightBlocks?.length);
  const hasBottomBlocks = Boolean(bottomBlocks?.length);
  const siteTitle = siteSettings?.siteTitle || "Zay Blog";
  const siteSubtitle = siteSettings?.siteSubtitle || "";
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    function check() {
      if (window.innerWidth < 680) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <div className={"site-shell" + (sidebarOpen ? "" : " sidebar-hidden")}>
      <header className="topbar">
        <div className="topbar-left">
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label={sidebarOpen ? "折叠侧栏" : "展开侧栏"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1={sidebarOpen ? "3" : "9"} y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <Link href="/" className="brand-mark" aria-label="首页">
            <img className="brand-logo" src="/logo.svg" alt="个人博客标志" />
            <span>
              <strong>{siteTitle}</strong>
              <small>{siteSubtitle}</small>
            </span>
          </Link>
        </div>

        <nav className="topnav" aria-label="主导航">
          <Link href="/">文章</Link>
          <ThemeToggle />
        </nav>
      </header>

      <main className={"content-grid" + (hasRightBlocks ? " has-right-sidebar" : "")}>
        <aside className="sidebar-column sidebar-column--left">
          {leftAddon}
          <SidebarRegion blocks={leftBlocks} />
          {showFilters ? (
            <section className="sidebar-card control-card">
              <SearchBox currentSearch={currentSearch} />
              <CategoryFilter
                categories={categories}
                currentCategory={currentCategory}
                currentTag={currentTag}
                currentSearch={currentSearch}
              />
              <TagCloud
                tags={tags}
                currentTag={currentTag}
                currentCategory={currentCategory}
                currentSearch={currentSearch}
              />
            </section>
          ) : null}
        </aside>

        <section className="main-column">{children}</section>

        {hasRightBlocks ? (
          <aside className="sidebar-column sidebar-column--right">
            <SidebarRegion blocks={rightBlocks} title="右侧区域" />
          </aside>
        ) : null}
      </main>

      {hasBottomBlocks ? (
        <footer className="bottom-panel">
          <SidebarRegion blocks={bottomBlocks} title="底部区域" />
        </footer>
      ) : null}
    </div>
  );
}
