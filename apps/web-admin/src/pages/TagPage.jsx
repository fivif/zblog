import { useEffect, useState } from "react";

import { ErrorNotice, FlashNotice } from "../components/Notice";
import { api } from "../lib/api";
import { slugifyInput } from "../lib/article-form";

const EMPTY_TAG = { name: "", slug: "" };

export function TagPage() {
  const [tags, setTags] = useState([]);
  const [form, setForm] = useState(EMPTY_TAG);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");

  async function refresh() {
    try {
      setError("");
      const data = await api.listTags();
      setTags(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function fillSlug() {
    setForm((current) => ({ ...current, slug: slugifyInput(current.name) }));
  }

  function editTag(tag) {
    setEditingId(tag.id);
    setForm({ name: tag.name, slug: tag.slug });
    setError("");
    setFlash("");
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_TAG);
  }

  async function saveTag(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      const payload = { name: form.name.trim(), slug: slugifyInput(form.slug || form.name) };
      if (editingId) {
        await api.updateTag(editingId, payload);
        setFlash("标签已更新");
      } else {
        await api.createTag(payload);
        setFlash("标签已新增");
      }
      resetForm();
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteTag(tag) {
    if (!window.confirm("删除标签「" + tag.name + "」？已有文章使用时不能删除。")) return;
    try {
      setError("");
      await api.deleteTag(tag.id);
      setFlash("标签已删除");
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="workspace-stack">
      <header className="page-heading">
        <div>
          <p className="section-kicker">标签配置</p>
          <h1>标签管理</h1>
          <p>维护文章标签；修改 slug 后，已关联文章会自动同步。</p>
        </div>
      </header>

      <FlashNotice message={flash} />
      <ErrorNotice message={error} />

      <div className="sidebar-admin-layout">
        <form className="panel stack-form" onSubmit={saveTag}>
          <div className="panel-title-row">
            <h2>{editingId ? "编辑标签" : "新增标签"}</h2>
            {editingId ? <button type="button" className="ghost-button" onClick={resetForm}>取消</button> : null}
          </div>
          <label>
            标签名称
            <input value={form.name} onChange={(event) => updateField("name", event.target.value)} />
          </label>
          <label>
            slug
            <div className="inline-input-row">
              <input value={form.slug} onChange={(event) => updateField("slug", event.target.value)} />
              <button type="button" className="ghost-button" onClick={fillSlug}>生成</button>
            </div>
          </label>
          <button type="submit" disabled={saving}>{saving ? "保存中…" : editingId ? "更新标签" : "新增标签"}</button>
        </form>

        <div className="panel sidebar-block-list">
          {loading ? <p className="muted-text">加载中…</p> : null}
          {!loading && !tags.length ? <p className="muted-text">还没有标签。</p> : null}
          {tags.map((tag) => (
            <article key={tag.id} className="sidebar-admin-item">
              <div>
                <span className={"status-dot " + (tag.articleCount ? "status-dot--published" : "status-dot--archived")} />
                <strong>{tag.name}</strong>
                <p>{tag.slug} · {tag.articleCount} 篇文章</p>
              </div>
              <div className="sidebar-admin-preview">
                {tag.articleCount ? "正在被文章使用，不能直接删除。" : "未被使用，可安全删除。"}
              </div>
              <div className="button-row compact-actions">
                <button type="button" className="ghost-button" onClick={() => editTag(tag)}>编辑</button>
                <button type="button" className="ghost-button danger-button" disabled={Boolean(tag.articleCount)} onClick={() => deleteTag(tag)}>删除</button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
