import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { CATEGORY_OPTIONS } from "@blog/contracts";

import { AdminShell } from "./components/AdminShell";
import { api } from "./lib/api";
import { ArticleEditorPage, RouteArticleEditor } from "./pages/ArticleEditorPage";
import { ArticleListPage } from "./pages/ArticleListPage";
import { CategoryPage } from "./pages/CategoryPage";
import { LoginPage } from "./pages/LoginPage";
import { MediaPage } from "./pages/MediaPage";
import { SidebarPage } from "./pages/SidebarPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TagPage } from "./pages/TagPage";

function RequireAuth({ authenticated, children }) {
  if (!authenticated) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [categories, setCategories] = useState(CATEGORY_OPTIONS);

  async function refreshMeta() {
    try {
      const meta = await api.meta();
      setCategories(meta.categories?.length ? meta.categories : CATEGORY_OPTIONS);
    } catch {
      setCategories(CATEGORY_OPTIONS);
    }
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        await api.session();
        setAuthenticated(true);
      } catch {
        setAuthenticated(false);
      }

      await refreshMeta();
      setBooting(false);
    }

    bootstrap();
  }, []);

  const handleLogout = async () => {
    await api.logout().catch(() => null);
    setAuthenticated(false);
  };

  const routes = useMemo(
    () => (
      <Routes>
        <Route path="/login" element={authenticated ? <Navigate to="/articles" replace /> : <LoginPage onLogin={() => setAuthenticated(true)} />} />
        <Route
          path="*"
          element={
            <RequireAuth authenticated={authenticated}>
              <AdminShell authenticated={authenticated} onLogout={handleLogout}>
                <Routes>
                  <Route path="/articles" element={<ArticleListPage categories={categories} />} />
                  <Route path="/articles/new" element={<ArticleEditorPage categories={categories} articleId="new" />} />
                  <Route path="/articles/:articleId" element={<RouteArticleEditor categories={categories} />} />
                  <Route path="/categories" element={<CategoryPage onCategoriesChanged={refreshMeta} />} />
                  <Route path="/tags" element={<TagPage />} />
                  <Route path="/media" element={<MediaPage />} />
                  <Route path="/sidebar" element={<SidebarPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<Navigate to="/articles" replace />} />
                </Routes>
              </AdminShell>
            </RequireAuth>
          }
        />
      </Routes>
    ),
    [authenticated, categories],
  );

  if (booting) return <div className="login-shell">后台加载中…</div>;
  return routes;
}
