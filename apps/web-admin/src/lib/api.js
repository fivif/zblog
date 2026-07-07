export function resolveApiBaseUrl() {
  const viteEnv = import.meta.env || {};
  if (viteEnv.VITE_API_BASE_URL) {
    return viteEnv.VITE_API_BASE_URL;
  }

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol || "http:";
    const hostname = window.location.hostname || "localhost";
    return protocol + "//" + hostname + ":8000";
  }

  return "http://localhost:8000";
}

const API_BASE_URL = resolveApiBaseUrl();

async function request(path, options = {}) {
  const response = await fetch(API_BASE_URL + path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (response.status === 204) {
    return null;
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.detail || "请求失败");
    error.status = response.status;
    throw error;
  }
  return payload;
}

export const api = {
  session: () => request("/api/admin/auth/session", { method: "GET" }),
  login: (body) =>
    request("/api/admin/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  logout: () => request("/api/admin/auth/logout", { method: "POST" }),
  meta: () => request("/api/admin/meta", { method: "GET" }),
  getSiteSettings: () => request("/api/admin/site-settings", { method: "GET" }),
  updateSiteSettings: (body) =>
    request("/api/admin/site-settings", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  listCategories: () => request("/api/admin/categories", { method: "GET" }),
  createCategory: (body) =>
    request("/api/admin/categories", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateCategory: (id, body) =>
    request("/api/admin/categories/" + id, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  deleteCategory: (id) => request("/api/admin/categories/" + id, { method: "DELETE" }),
  listTags: () => request("/api/admin/tags", { method: "GET" }),
  createTag: (body) =>
    request("/api/admin/tags", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateTag: (id, body) =>
    request("/api/admin/tags/" + id, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  deleteTag: (id) => request("/api/admin/tags/" + id, { method: "DELETE" }),
  listArticles: (params = {}) => {
    const search = new URLSearchParams();
    if (params.search) search.set("search", params.search);
    if (params.category) search.set("category", params.category);
    if (params.status) search.set("statusValue", params.status);
    return request("/api/admin/articles" + (search.size ? "?" + search.toString() : ""), {
      method: "GET",
    });
  },
  getArticle: (id) => request("/api/admin/articles/" + id, { method: "GET" }),
  createArticle: (body) =>
    request("/api/admin/articles", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateArticle: (id, body) =>
    request("/api/admin/articles/" + id, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  deleteArticle: (id) => request("/api/admin/articles/" + id, { method: "DELETE" }),
  previewArticle: (markdown) =>
    request("/api/admin/articles/preview", {
      method: "POST",
      body: JSON.stringify({ markdown }),
    }),
  publishArticle: (id) => request("/api/admin/articles/" + id + "/publish", { method: "POST" }),
  unpublishArticle: (id) => request("/api/admin/articles/" + id + "/unpublish", { method: "POST" }),
  listSidebarBlocks: () => request("/api/admin/sidebar-blocks", { method: "GET" }),
  createSidebarBlock: (body) =>
    request("/api/admin/sidebar-blocks", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateSidebarBlock: (id, body) =>
    request("/api/admin/sidebar-blocks/" + id, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  deleteSidebarBlock: (id) => request("/api/admin/sidebar-blocks/" + id, { method: "DELETE" }),
  listMedia: () => request("/api/admin/media", { method: "GET" }),
  deleteMedia: (fileName) => request("/api/admin/media/" + encodeURIComponent(fileName), { method: "DELETE" }),
  uploadMedia: async (file) => {
    const form = new FormData();
    form.append("file", file);
    const response = await fetch(API_BASE_URL + "/api/admin/media/upload", {
      method: "POST",
      credentials: "include",
      body: form,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(payload?.detail || "上传失败");
      error.status = response.status;
      throw error;
    }
    return payload;
  },
};
