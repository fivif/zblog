import { useEffect, useState } from "react";

import { ErrorNotice, FlashNotice } from "../components/Notice";
import { api } from "../lib/api";
import { slugifyInput } from "../lib/article-form";
import { categoryDisplayName, collectCategorySubtreeIds, flattenCategories } from "../lib/category-tree";

const EMPTY_CATEGORY = {
  name: "",
  slug: "",
  parentId: null,
  sortOrder: 0,
  enabled: true,
};

export function CategoryPage({ onCategoriesChanged }) {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(EMPTY_CATEGORY);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const flatCategories = flattenCategories(categories);
  const blockedParentIds = editingId
    ? collectCategorySubtreeIds(flatCategories.find((category) => category.id === editingId))
    : new Set();

  async function refresh() {
    try {
      setError("");
      const data = await api.listCategories();
      setCategories(data || []);
      await onCategoriesChanged?.();
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

  function fillSlug() {
    setForm((current) => ({ ...current, slug: slugifyInput(current.name) }));
  }

  function editCategory(category) {
    setEditingId(category.id);
    setForm({
      name: category.name,
      slug: category.slug,
      parentId: category.parentId ?? null,
      sortOrder: category.sortOrder,
      enabled: category.enabled,
    });
    setFlash("");
    setError("");
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_CATEGORY);
  }

  async function saveCategory(event) {
    event.preventDefault();
    try {
      setError("");
      const payload = {
        ...form,
        name: form.name.trim(),
        slug: slugifyInput(form.slug || form.name),
        parentId: form.parentId ? Number(form.parentId) : null,
      };
      if (editingId) {
        await api.updateCategory(editingId, payload);
        setFlash("分类已更新");
      } else {
        await api.createCategory(payload);
        setFlash("分类已新增");
      }
      resetForm();
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  function renderCategory(category) {
    return (
      <article key={category.id} className="sidebar-admin-item category-admin-item" style={{ "--tree-depth": category.depth || 0 }}>
        <div>
          <span className={"status-dot " + (category.enabled ? "status-dot--published" : "status-dot--archived")} />
          <strong>{category.name}</strong>
          <p>{category.slug} · 排序 {category.sortOrder} · {category.enabled ? "已启用" : "已停用"}</p>
        </div>
        <div className="sidebar-admin-preview">
          {category.children?.length
            ? `${category.children.length} 个子分类；前台点击父分类会包含子分类文章。`
            : category.enabled
              ? "前台分类树会显示这个分类。"
              : "前台已隐藏，后台仍可用于整理。"}
        </div>
        <div className="button-row compact-actions">
          <button type="button" className="ghost-button" onClick={() => editCategory(category)}>
            编辑
          </button>
          <button type="button" className="ghost-button danger-button" onClick={() => deleteCategory(category)}>
            删除
          </button>
        </div>
      </article>
    );
  }

  async function deleteCategory(category) {
    if (!window.confirm("确定删除分类「" + category.name + "」？已有文章使用时不能删除。")) return;
    try {
      setError("");
      await api.deleteCategory(category.id);
      setFlash("分类已删除");
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="workspace-stack">
      <header className="page-heading">
        <div>
          <p className="section-kicker">分类配置</p>
          <h1>分类管理</h1>
          <p>新增、编辑、排序、启用或停用分类；停用后前台不展示，但已有关联文章不会丢失。</p>
        </div>
      </header>

      <FlashNotice message={flash} />
      <ErrorNotice message={error} />

      <div className="sidebar-admin-layout">
        <form className="panel stack-form" onSubmit={saveCategory}>
          <div className="panel-title-row">
            <h2>{editingId ? "编辑分类" : "新增分类"}</h2>
            {editingId ? (
              <button type="button" className="ghost-button" onClick={resetForm}>
                取消
              </button>
            ) : null}
          </div>

          <label>
            分类名称
            <input value={form.name} onChange={(event) => updateField("name", event.target.value)} />
          </label>

          <label>
            固定链接
            <div className="inline-input-row">
              <input value={form.slug} onChange={(event) => updateField("slug", event.target.value)} />
              <button type="button" className="ghost-button" onClick={fillSlug}>
                生成
              </button>
            </div>
          </label>

          <label>
            父分类
            <select value={form.parentId || ""} onChange={(event) => updateField("parentId", event.target.value || null)}>
              <option value="">无，作为一级分类</option>
              {flatCategories
                .filter((category) => !blockedParentIds.has(category.id))
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {categoryDisplayName(category)}
                  </option>
                ))}
            </select>
          </label>

          <label>
            排序
            <input
              type="number"
              value={form.sortOrder}
              onChange={(event) => updateField("sortOrder", Number(event.target.value))}
            />
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(event) => updateField("enabled", event.target.checked)}
            />
            启用
          </label>

          <button type="submit">{editingId ? "更新分类" : "新增分类"}</button>
        </form>

        <div className="panel sidebar-block-list">
          {flatCategories.map((category) => renderCategory(category))}
        </div>
      </div>
    </section>
  );
}
