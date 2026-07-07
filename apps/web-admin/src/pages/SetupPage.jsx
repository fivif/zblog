import { useState } from "react";
import { api } from "../lib/api";

export function SetupPage({ onSetup }) {
  const [form, setForm] = useState({ username: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!form.username.trim()) { setError("请输入用户名"); return; }
    if (form.password.length < 4) { setError("密码至少4个字符"); return; }
    if (form.password !== form.confirm) { setError("两次密码不一致"); return; }
    setSubmitting(true);
    try {
      await api.setup({ username: form.username.trim(), password: form.password });
      onSetup();
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
          <p className="section-kicker">欢迎使用</p>
          <h1>初始化博客后台</h1>
          <p>首次使用需要设置管理员账户和密码，之后可在站点设置中修改。</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            用户名
            <input
              autoComplete="username"
              value={form.username}
              placeholder="设置管理员用户名"
              onChange={(event) => setForm((c) => ({ ...c, username: event.target.value }))}
            />
          </label>
          <label>
            密码
            <input
              type="password"
              autoComplete="new-password"
              value={form.password}
              placeholder="至少4个字符"
              onChange={(event) => setForm((c) => ({ ...c, password: event.target.value }))}
            />
          </label>
          <label>
            确认密码
            <input
              type="password"
              autoComplete="new-password"
              value={form.confirm}
              placeholder="再次输入密码"
              onChange={(event) => setForm((c) => ({ ...c, confirm: event.target.value }))}
            />
          </label>
          {error ? <p className="notice notice--error">{error}</p> : null}
          <button type="submit" disabled={submitting}>
            {submitting ? "创建中…" : "创建管理员账户"}
          </button>
        </form>
      </section>
    </div>
  );
}
