import { useEffect, useState } from "react";

import { ErrorNotice, FlashNotice } from "../components/Notice";
import { api } from "../lib/api";

const TEXT = {
  kicker: "站点资料",
  title: "站点设置",
  desc: "配置前台顶部显示的标题和副标题。",
  formTitle: "顶部品牌文案",
  titleLabel: "标题",
  subtitleLabel: "副标题",
  save: "保存设置",
  saving: "保存中…",
  preview: "效果预览",
  previewHint: "保存后前台顶栏会立即使用这组文案。",
  saved: "站点设置已保存",
  loadError: "站点设置加载失败",
  titleRequired: "标题不能为空",
};

const DEFAULT_SETTINGS = {
  siteTitle: "个人博客",
  siteSubtitle: "写作系统",
};

export function SettingsPage() {
  const [form, setForm] = useState(DEFAULT_SETTINGS);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await api.getSiteSettings();
        setForm({
          siteTitle: data.siteTitle || DEFAULT_SETTINGS.siteTitle,
          siteSubtitle: data.siteSubtitle || "",
        });
      } catch (err) {
        setError(err.message || TEXT.loadError);
      }
    }
    loadSettings();
  }, []);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setFlash("");
  }

  async function saveSettings(event) {
    event.preventDefault();
    if (!form.siteTitle.trim()) {
      setError(TEXT.titleRequired);
      return;
    }

    try {
      setSaving(true);
      setError("");
      const saved = await api.updateSiteSettings({
        siteTitle: form.siteTitle.trim(),
        siteSubtitle: form.siteSubtitle.trim(),
      });
      setForm(saved);
      setFlash(TEXT.saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="workspace-stack">
      <header className="page-heading">
        <div>
          <p className="section-kicker">{TEXT.kicker}</p>
          <h1>{TEXT.title}</h1>
          <p>{TEXT.desc}</p>
        </div>
      </header>

      <FlashNotice message={flash} />
      <ErrorNotice message={error} />

      <div className="settings-layout">
        <form className="panel stack-form" onSubmit={saveSettings}>
          <div className="panel-title-row">
            <h2>{TEXT.formTitle}</h2>
          </div>
          <label>
            {TEXT.titleLabel}
            <input
              value={form.siteTitle}
              maxLength="32"
              onChange={(event) => updateField("siteTitle", event.target.value)}
            />
          </label>
          <label>
            {TEXT.subtitleLabel}
            <input
              value={form.siteSubtitle}
              maxLength="48"
              onChange={(event) => updateField("siteSubtitle", event.target.value)}
            />
          </label>
          <button type="submit" disabled={saving}>{saving ? TEXT.saving : TEXT.save}</button>
        </form>

        <aside className="panel brand-preview-card">
          <div className="panel-title-row">
            <h2>{TEXT.preview}</h2>
          </div>
          <div className="brand-preview-pill">
            <img src="/logo.svg" alt="" />
            <span>
              <strong>{form.siteTitle || DEFAULT_SETTINGS.siteTitle}</strong>
              <small>{form.siteSubtitle || DEFAULT_SETTINGS.siteSubtitle}</small>
            </span>
          </div>
          <p className="muted-text">{TEXT.previewHint}</p>
        </aside>
      </div>
    </section>
  );
}
