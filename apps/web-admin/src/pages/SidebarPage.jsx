import { useEffect, useState } from "react";

import { ErrorNotice, FlashNotice } from "../components/Notice";
import { api } from "../lib/api";
import { sidebarRegionLabel, sidebarTypeLabel } from "../lib/format";

const EMPTY_BLOCK = {
  region: "left",
  type: "markdown",
  title: "",
  content: "",
  enabled: true,
  sortOrder: 0,
};

const REGIONS = ["left", "right", "bottom"];
const TYPES = ["markdown", "notice", "html", "link-group", "ad"];

export function SidebarPage() {
  const [blocks, setBlocks] = useState([]);
  const [form, setForm] = useState(EMPTY_BLOCK);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");

  async function refresh() {
    try {
      setError("");
      const data = await api.listSidebarBlocks();
      setBlocks(data || []);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function saveBlock(event) {
    event.preventDefault();
    try {
      setError("");
      if (editingId) {
        await api.updateSidebarBlock(editingId, form);
        setFlash("内容块已更新");
      } else {
        await api.createSidebarBlock(form);
        setFlash("内容块已新增");
      }
      setForm(EMPTY_BLOCK);
      setEditingId(null);
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteBlock(block) {
    if (!window.confirm("删除内容块「" + (block.title || sidebarTypeLabel(block.type)) + "」？")) return;
    try {
      await api.deleteSidebarBlock(block.id);
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  function editBlock(block) {
    setEditingId(block.id);
    setForm({
      region: block.region,
      type: block.type,
      title: block.title,
      content: block.content,
      enabled: block.enabled,
      sortOrder: block.sortOrder,
    });
    setFlash("");
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_BLOCK);
  }

  return (
    <section className="workspace-stack">
      <header className="page-heading">
        <div>
          <p className="section-kicker">布局区域</p>
          <h1>边栏内容管理</h1>
          <p>左右和底部区域可配置留言、通知、广告、链接组或 HTML。</p>
        </div>
      </header>

      <FlashNotice message={flash} />
      <ErrorNotice message={error} />

      <div className="sidebar-admin-layout">
        <form className="panel stack-form" onSubmit={saveBlock}>
          <div className="panel-title-row">
            <h2>{editingId ? "编辑内容块" : "新增内容块"}</h2>
            {editingId ? <button type="button" className="ghost-button" onClick={resetForm}>取消</button> : null}
          </div>
          <label>
            区域
            <select value={form.region} onChange={(event) => updateField("region", event.target.value)}>
              {REGIONS.map((region) => <option key={region} value={region}>{sidebarRegionLabel(region)}</option>)}
            </select>
          </label>
          <label>
            类型
            <select value={form.type} onChange={(event) => updateField("type", event.target.value)}>
              {TYPES.map((type) => <option key={type} value={type}>{sidebarTypeLabel(type)}</option>)}
            </select>
          </label>
          <label>
            标题
            <input value={form.title} onChange={(event) => updateField("title", event.target.value)} />
          </label>
          <label>
            内容
            <textarea
              rows="12"
              placeholder={form.type === "link-group" ? "站点名|https://example.com\n资料页|https://example.com/docs" : "支持 Markdown；HTML 会按安全白名单清洗后展示。"}
              value={form.content}
              onChange={(event) => updateField("content", event.target.value)}
            />
          </label>
          <label>
            排序
            <input type="number" value={form.sortOrder} onChange={(event) => updateField("sortOrder", Number(event.target.value))} />
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={form.enabled} onChange={(event) => updateField("enabled", event.target.checked)} />
            启用
          </label>
          <button type="submit">{editingId ? "更新内容块" : "新增内容块"}</button>
        </form>

        <div className="panel sidebar-block-list">
          {blocks.length ? null : <p className="muted-text">还没有配置边栏内容。</p>}
          {blocks.map((block) => (
            <article key={block.id} className="sidebar-admin-item">
              <div>
                <span className={"status-dot " + (block.enabled ? "status-dot--published" : "status-dot--archived")} />
                <strong>{block.title || "未命名"}</strong>
                <p>{sidebarRegionLabel(block.region)} · {sidebarTypeLabel(block.type)} · 排序 {block.sortOrder}</p>
              </div>
              <div className="sidebar-admin-preview">
                {block.content.slice(0, 140) || "无内容"}
              </div>
              <div className="button-row compact-actions">
                <button type="button" className="ghost-button" onClick={() => editBlock(block)}>编辑</button>
                <button type="button" className="ghost-button danger-button" onClick={() => deleteBlock(block)}>删除</button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
