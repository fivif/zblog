import Link from "next/link";

function buildTagHref(tag, currentCategory, currentSearch) {
  const params = new URLSearchParams();
  if (currentCategory && currentCategory !== "all") params.set("category", currentCategory);
  if (tag) params.set("tag", tag);
  if (currentSearch) params.set("search", currentSearch);
  const suffix = params.toString();
  return suffix ? "/?" + suffix : "/";
}

export function TagCloud({ tags, currentTag, currentCategory, currentSearch }) {
  if (!tags?.length) return null;

  return (
    <div className="tag-cloud-panel">
      <div className="filter-row-title">
        <span>标签</span>
        {currentTag ? <Link href={buildTagHref("", currentCategory, currentSearch)}>清除</Link> : null}
      </div>
      <div className="tag-cloud">
        {tags.map((tag) => (
          <Link
            key={tag.slug}
            href={buildTagHref(tag.slug, currentCategory, currentSearch)}
            className={"tag-pill" + (currentTag === tag.slug ? " is-active" : "")}
          >
            {'#' + tag.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
