import { useEffect, useRef, useState } from "react";

import { ErrorNotice, FlashNotice } from "../components/Notice";
import { api } from "../lib/api";

function formatSize(size) {
  if (size < 1024) return size + " B";
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + " KB";
  return (size / 1024 / 1024).toFixed(1) + " MB";
}

function mediaTypeLabel(type) {
  return type === "video" ? "视频" : "图片";
}

export function MediaPage() {
  const inputRef = useRef(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const [uploading, setUploading] = useState(false);

  async function refresh() {
    try {
      setError("");
      const data = await api.listMedia();
      setItems(data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function uploadSelected(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      setError("");
      const uploaded = await api.uploadMedia(file);
      setFlash("已上传：" + uploaded.fileName);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function copyMarkdown(item) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(item.markdown);
      setFlash("已复制 Markdown 引用");
    } else {
      setFlash("当前浏览器不支持自动复制，请手动复制 Markdown 引用。");
    }
  }

  async function deleteItem(item) {
    if (!window.confirm("删除媒体文件「" + item.fileName + "」？")) return;
    try {
      setError("");
      await api.deleteMedia(item.fileName);
      setFlash("媒体已删除");
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="workspace-stack">
      <header className="page-heading">
        <div>
          <p className="section-kicker">文件资源</p>
          <h1>媒体库</h1>
          <p>查看、上传、复制 Markdown 引用，并删除未使用的图片或视频。</p>
        </div>
        <label className="ghost-button upload-button">
          {uploading ? "上传中…" : "上传媒体"}
          <input ref={inputRef} type="file" accept="image/*,video/*" onChange={uploadSelected} disabled={uploading} />
        </label>
      </header>

      <FlashNotice message={flash} />
      <ErrorNotice message={error} />

      <div className="media-library-grid">
        {loading ? <div className="panel muted-text">加载中…</div> : null}
        {!loading && !items.length ? <div className="panel muted-text">还没有媒体文件。</div> : null}
        {items.map((item) => (
          <article key={item.fileName} className="panel media-card">
            <div className="media-thumb">
              {item.type === "video" ? <video src={item.url} controls /> : <img src={item.url} alt="" loading="lazy" />}
            </div>
            <div className="media-card-body">
              <div>
                <strong>{item.fileName}</strong>
                <p>{mediaTypeLabel(item.type)} · {formatSize(item.size)} · {item.used ? "使用中" : "未使用"}</p>
              </div>
              <code>{item.markdown}</code>
              <div className="button-row compact-actions">
                <button type="button" className="ghost-button" onClick={() => copyMarkdown(item)}>复制 Markdown</button>
                <button type="button" className="ghost-button danger-button" disabled={item.used} onClick={() => deleteItem(item)}>删除</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
