import { Link, NavLink } from "react-router-dom";

export function AdminShell({ authenticated, onLogout, children }) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link to="/articles" className="admin-brand">
          <img className="admin-brand-logo" src="/logo.svg" alt="博客标志" />
          <span>
            <strong>博客工作台</strong>
            <small>Markdown 写作与发布后台</small>
          </span>
        </Link>

        <nav className="admin-nav" aria-label="后台导航">
          <NavLink to="/articles">文章管理</NavLink>
          <NavLink to="/articles/new">写文章</NavLink>
          <NavLink to="/categories">分类管理</NavLink>
          <NavLink to="/tags">标签管理</NavLink>
          <NavLink to="/media">媒体库</NavLink>
          <NavLink to="/sidebar">边栏配置</NavLink>
          <NavLink to="/settings">站点设置</NavLink>
          <a href="http://127.0.0.1:3000" target="_blank" rel="noreferrer">
            查看前台 ↗
          </a>
        </nav>

        <div className="sidebar-footnote">
          <span />
          <p>FastAPI API · React 后台 · Markdown 内容</p>
        </div>

        {authenticated ? (
          <button type="button" className="ghost-button full-width" onClick={onLogout}>
            退出登录
          </button>
        ) : null}
      </aside>

      <main className="admin-main">{children}</main>
    </div>
  );
}
