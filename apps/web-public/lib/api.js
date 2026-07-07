const API_BASE_URL =
  process.env.PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

async function safeFetch(path) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }
    return response.json();
  } catch {
    return null;
  }
}

export async function fetchSiteSettings() {
  return (
    (await safeFetch("/api/public/site-settings")) || {
      siteTitle: "个人博客",
      siteSubtitle: "写作系统",
    }
  );
}

export async function fetchCategories() {
  return (await safeFetch("/api/public/categories")) || [];
}

export async function fetchTags() {
  return (await safeFetch("/api/public/tags")) || [];
}

export async function fetchSidebarBlocks() {
  return (
    (await safeFetch("/api/public/sidebar-blocks")) || {
      left: [],
      right: [],
      bottom: [],
    }
  );
}

export async function fetchPublicArticles({ category, tag, search } = {}) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (tag) params.set("tag", tag);
  if (search) params.set("search", search);
  const suffix = params.size ? `?${params.toString()}` : "";
  return (await safeFetch(`/api/public/articles${suffix}`)) || { items: [] };
}

export async function fetchArticle(slug) {
  return safeFetch(`/api/public/articles/${encodeURIComponent(slug)}`);
}
