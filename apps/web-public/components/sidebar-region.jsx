"use client";

import ReactMarkdown from "react-markdown";
import { useEffect, useRef } from "react";

function parseLinks(content) {
  return String(content || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, url] = line.includes("|") ? line.split("|").map((part) => part.trim()) : [line, line];
      return { label, url };
    });
}

function sidebarTypeLabel(type) {
  return {
    markdown: "Markdown",
    notice: "通知",
    html: "HTML",
    "link-group": "链接组",
    ad: "广告",
  }[type] || "内容";
}

function SidebarBlockContent({ block }) {
  if (block.type === "html") {
    return <div className="sidebar-rich" dangerouslySetInnerHTML={{ __html: block.content }} />;
  }
  if (block.type === "link-group") {
    const links = parseLinks(block.content);
    return (
      <div className="sidebar-links">
        {links.map((link) => (
          <a key={link.label + "-" + link.url} href={link.url} target="_blank" rel="noopener noreferrer">
            {link.label}
            <span>↗</span>
          </a>
        ))}
      </div>
    );
  }
  return <ReactMarkdown>{block.content}</ReactMarkdown>;
}

export function SidebarRegion({ blocks, title }) {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.querySelectorAll('a[href^="http"]').forEach((anchor) => {
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noopener noreferrer");
    });
  }, [blocks]);

  if (!blocks?.length) return null;

  return (
    <section ref={rootRef} className="sidebar-region">
      {title ? <p className="sidebar-region-title">{title}</p> : null}
      {blocks.map((block) => (
        <article key={block.id} className={"sidebar-card sidebar-card--" + block.type}>
          <div className="sidebar-card-header">
            {block.title ? <h3>{block.title}</h3> : null}
            <span>{sidebarTypeLabel(block.type)}</span>
          </div>
          <SidebarBlockContent block={block} />
        </article>
      ))}
    </section>
  );
}
