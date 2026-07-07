import { useState } from "react";

import { api } from "../lib/api";

export function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ username: "admin", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.login(form);
      onLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-shell">
      <section className="login-card">
        <div className="login-copy">
          <p className="section-kicker">个人博客系统</p>
          <h1>进入写作后台</h1>
          <p>写文章、实时预览、上传媒体、发布到前台，所有核心操作集中在这里。</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            用户名
            <input
              autoComplete="username"
              value={form.username}
              onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
            />
          </label>
          <label>
            密码
            <input
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            />
          </label>
          {error ? <p className="notice notice--error">{error}</p> : null}
          <button type="submit" disabled={submitting}>
            {submitting ? "登录中…" : "进入后台"}
          </button>
        </form>
      </section>
    </div>
  );
}
