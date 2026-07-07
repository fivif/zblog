import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { ErrorNotice, FlashNotice } from "../components/Notice";
import { api } from "../lib/api";
import { buildArticlePayload, slugifyInput } from "../lib/article-form";
import { categoryDisplayName } from "../lib/category-tree";
import { statusLabel } from "../lib/format";

function createEmptyArticleForm(categories) {
  return {
    title: "",
    slug: "",
    summary: "",
    coverImage: "",
    categorySlug: categories[0]?.slug || "daily",
    tagInput: "",
    status: "draft",
    markdown: "# 新文章\n\n从这里开始写。\n\n~~~python\nprint('你好，博客')\n~~~",
  };
}

export function RouteArticleEditor({ categories }) {
  const { articleId } = useParams();
  return <ArticleEditorPage categories={categories} articleId={articleId} />;
}

export function ArticleEditorPage({ categories, articleId }) {
  const navigate = useNavigate();
  const textareaRef = useRef(null);
  const isNew = articleId === "new";
  const initialForm = useMemo(() => createEmptyArticleForm(categories), [categories]);
  const [form, setForm] = useState(initialForm);
  const [articleDbId, setArticleDbId] = useState(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [flash, setFlash] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState("split");
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [draggingMedia, setDraggingMedia] = useState(false);
  const previewBodyRef = useRef(null);

  useEffect(() => {
    async function bootstrap() {
      try {
        setError("");
        setFlash("");
        if (isNew) {
          const empty = createEmptyArticleForm(categories);
          setArticleDbId(null);
          setForm(empty);
          const preview = await api.previewArticle(empty.markdown);
          setPreviewHtml(preview.html);
          return;
        }
        const article = await api.getArticle(articleId);
        setArticleDbId(article.id);
        setForm({
          title: article.title,
          slug: article.slug,
          summary: article.summary,
          coverImage: article.coverImage || "",
          categorySlug: article.category.slug,
          tagInput: article.tags.map((tag) => tag.slug).join(", "),
          status: article.status,
          markdown: article.markdown,
        });
        setPreviewHtml(article.html);
      } catch (err) {
        setError(err.message);
      }
    }

    bootstrap();
  }, [articleId, isNew, categories]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const preview = await api.previewArticle(form.markdown);
        setPreviewHtml(preview.html);
      } catch {
        // 保留上一次可用预览。
      }
    }, 280);
    return () => window.clearTimeout(timer);
  }, [form.markdown]);

  useEffect(() => {
    const root = previewBodyRef.current;
    if (!root) return;
    import("plyr").then(({ default: Plyr }) => {
      root.querySelectorAll("video:not([data-plyr])").forEach((video) => {
        try {
          new Plyr(video, {
            controls: ["play-large", "play", "progress", "current-time", "mute", "volume", "fullscreen"],
          });
        } catch (_) {}
      });
    });
  }, [previewHtml]);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function generateSlugFromTitle() {
    setForm((current) => ({ ...current, slug: slugifyInput(current.title) }));
  }

  function readEditorSelection() {
    const textarea = textareaRef.current;
    if (!textarea) return null;
    return {
      start: textarea.selectionStart ?? form.markdown.length,
      end: textarea.selectionEnd ?? textarea.selectionStart ?? form.markdown.length,
    };
  }

  function getEditorRangeFromPoint(clientX, clientY) {
    const textarea = textareaRef.current;
    if (!textarea || typeof window === "undefined") return readEditorSelection();

    const styles = window.getComputedStyle(textarea);
    const fontSize = Number.parseFloat(styles.fontSize) || 14;
    const lineHeight = Number.parseFloat(styles.lineHeight) || fontSize * 1.7;
    const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0;
    const paddingRight = Number.parseFloat(styles.paddingRight) || 0;
    const paddingTop = Number.parseFloat(styles.paddingTop) || 0;
    const rect = textarea.getBoundingClientRect();
    const x = Math.max(0, clientX - rect.left - paddingLeft);
    const y = Math.max(0, clientY - rect.top - paddingTop + textarea.scrollTop);

    const probe = document.createElement("span");
    probe.textContent = "0123456789abcdefghijklmnopqrstuvwxyz";
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.whiteSpace = "pre";
    probe.style.font = styles.font;
    document.body.appendChild(probe);
    const charWidth = Math.max(1, probe.getBoundingClientRect().width / probe.textContent.length);
    probe.remove();

    const columns = Math.max(1, Math.floor((textarea.clientWidth - paddingLeft - paddingRight) / charWidth));
    let visualLine = Math.max(0, Math.floor(y / lineHeight));
    let offset = 0;
    const lines = (form.markdown || "").split("\n");

    for (const line of lines) {
      const visualLineCount = Math.max(1, Math.ceil(Math.max(1, line.length) / columns));
      if (visualLine < visualLineCount) {
        const column = Math.min(line.length, visualLine * columns + Math.round(x / charWidth));
        const position = offset + column;
        textarea.focus();
        textarea.setSelectionRange(position, position);
        return { start: position, end: position };
      }
      visualLine -= visualLineCount;
      offset += line.length + 1;
    }

    textarea.focus();
    textarea.setSelectionRange(form.markdown.length, form.markdown.length);
    return { start: form.markdown.length, end: form.markdown.length };
  }

  async function saveArticle(nextStatus = form.status) {
    setSaving(true);
    try {
      setError("");
      const payload = buildArticlePayload({ ...form, status: nextStatus });
      const result =
        isNew && !articleDbId ? await api.createArticle(payload) : await api.updateArticle(articleDbId || articleId, payload);
      setArticleDbId(result.id);
      setForm((current) => ({ ...current, status: result.status, slug: result.slug }));
      setPreviewHtml(result.html);
      setFlash("已保存：" + result.title);
      if (isNew) navigate("/articles/" + result.id, { replace: true });
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function publishArticle() {
    try {
      const saved = await saveArticle("published");
      const result = await api.publishArticle(saved.id);
      setForm((current) => ({ ...current, status: result.status }));
      setFlash("文章已发布");
    } catch {
      // saveArticle 已显示错误。
    }
  }

  async function unpublishArticle() {
    try {
      const targetId = articleDbId || articleId;
      if (!targetId || targetId === "new") {
        await saveArticle("draft");
        return;
      }
      const result = await api.unpublishArticle(targetId);
      setForm((current) => ({ ...current, status: result.status }));
      setFlash("文章已下线为草稿");
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteCurrentArticle() {
    const targetId = articleDbId || articleId;
    if (!targetId || targetId === "new") return;
    if (!window.confirm("确定删除当前文章？这个操作会删除正文文件。")) return;
    try {
      await api.deleteArticle(targetId);
      navigate("/articles", { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  function insertMarkdownAtCursor(snippet, range = null) {
    const textarea = textareaRef.current;
    const selection = range || readEditorSelection();
    const start = selection?.start ?? form.markdown.length;
    const end = selection?.end ?? start;

    setForm((current) => {
      const source = current.markdown || "";
      const safeStart = Math.max(0, Math.min(start, source.length));
      const safeEnd = Math.max(safeStart, Math.min(end, source.length));
      const before = source.slice(0, safeStart);
      const after = source.slice(safeEnd);
      const spacerBefore = before && !before.endsWith("\n") ? "\n\n" : "";
      const spacerAfter = after && !after.startsWith("\n") ? "\n\n" : "";
      const insertText = spacerBefore + snippet + spacerAfter;
      const nextCursor = before.length + insertText.length;

      window.setTimeout(() => {
        textarea?.focus();
        textarea?.setSelectionRange(nextCursor, nextCursor);
      }, 0);

      return {
        ...current,
        markdown: before + insertText + after,
      };
    });
  }

  async function uploadAndInsertFiles(files, insertionRange = readEditorSelection()) {
    const uploadFiles = Array.from(files || []).filter(Boolean);
    if (!uploadFiles.length) return;

    try {
      setUploadingMedia(true);
      setError("");
      setFlash("正在上传媒体…");
      const uploaded = [];
      for (const file of uploadFiles) {
        uploaded.push(await api.uploadMedia(file));
      }
      insertMarkdownAtCursor(uploaded.map((item) => item.markdown).join("\n\n"), insertionRange);
      setFlash("已插入媒体：" + uploaded.map((item) => item.fileName).join("、"));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingMedia(false);
      setDraggingMedia(false);
    }
  }

  async function handleUpload(event) {
    const files = event.target.files;
    if (!files?.length) return;
    try {
      await uploadAndInsertFiles(files, readEditorSelection());
    } finally {
      event.target.value = "";
    }
  }

  function mediaFilesFromTransfer(dataTransfer) {
    const allowed = ["image/", "video/"];
    return Array.from(dataTransfer?.files || []).filter(
      (file) => allowed.some((prefix) => file.type.startsWith(prefix))
    );
  }

  function handlePaste(event) {
    const mediaFiles = Array.from(event.clipboardData?.items || [])
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((file) => file && (file.type.startsWith("image/") || file.type.startsWith("video/")));

    if (!mediaFiles.length) return;
    event.preventDefault();
    uploadAndInsertFiles(mediaFiles, readEditorSelection());
  }

  function handleDragOver(event) {
    const transferItems = Array.from(event.dataTransfer?.items || []);
    const hasMedia = transferItems.some(
      (item) => item.kind === "file" && (item.type.startsWith("image/") || item.type.startsWith("video/")),
    );
    const mayContainFiles = transferItems.some((item) => item.kind === "file") ||
      Array.from(event.dataTransfer?.types || []).includes("Files");
    if (!hasMedia && !mayContainFiles) return;
    event.preventDefault();
    setDraggingMedia(true);
  }

  function handleDrop(event) {
    const mediaFiles = mediaFilesFromTransfer(event.dataTransfer);
    if (!mediaFiles.length) return;
    event.preventDefault();
    const dropRange = getEditorRangeFromPoint(event.clientX, event.clientY);
    uploadAndInsertFiles(mediaFiles, dropRange);
  }

  function insertSnippet(kind) {
    const snippets = {
      h2: "## 小节标题\n\n这里写正文。",
      code: "~~~python\nprint('你好')\n~~~",
      quote: "> 重点提示或引用内容。",
      video: '<iframe src="https://example.com/embed/video" title="视频" width="100%" height="420" loading="lazy"></iframe>',
    };
    insertMarkdownAtCursor(snippets[kind]);
  }

  return (
    <section className="workspace-stack editor-workspace">
      <header className="page-heading editor-heading">
        <div>
          <p className="section-kicker">{isNew ? "新建文章" : "编辑文章"}</p>
          <h1>{isNew ? "新建文章" : form.title || "编辑文章"}</h1>
          <p>编辑正文、网页预览、上传媒体、发布状态一次完成。</p>
        </div>
        <div className="button-row">
          <button type="button" className="ghost-button" onClick={() => saveArticle()} disabled={saving}>
            {saving ? "保存中…" : "保存"}
          </button>
          <button type="button" onClick={publishArticle} disabled={saving}>
            发布
          </button>
          <button type="button" className="ghost-button" onClick={unpublishArticle}>
            下线
          </button>
          {!isNew ? (
            <button type="button" className="ghost-button danger-button" onClick={deleteCurrentArticle}>
              删除
            </button>
          ) : null}
        </div>
      </header>

      <FlashNotice message={flash} />
      <ErrorNotice message={error} />

      <div className="editor-layout">
        <aside className="panel meta-panel">
          <div className="panel-title-row">
            <h2>文章信息</h2>
            <span className={"status-badge status-badge--" + form.status}>{statusLabel(form.status)}</span>
          </div>
          <label>
            标题
            <input value={form.title} onChange={(event) => updateField("title", event.target.value)} />
          </label>
          <label>
            固定链接
            <div className="inline-input-row">
              <input value={form.slug} onChange={(event) => updateField("slug", event.target.value)} />
              <button type="button" className="ghost-button" onClick={generateSlugFromTitle}>
                生成
              </button>
            </div>
          </label>
          <label>
            摘要
            <textarea rows="4" value={form.summary} onChange={(event) => updateField("summary", event.target.value)} />
          </label>
          <label>
            封面图地址
            <input value={form.coverImage} onChange={(event) => updateField("coverImage", event.target.value)} />
          </label>
          <label>
            分类
            <select value={form.categorySlug} onChange={(event) => updateField("categorySlug", event.target.value)}>
              {categories.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {categoryDisplayName(category)}
                </option>
              ))}
            </select>
          </label>
          <label>
            标签（逗号分隔）
            <input value={form.tagInput} onChange={(event) => updateField("tagInput", event.target.value)} />
          </label>
          <label>
            状态
            <select value={form.status} onChange={(event) => updateField("status", event.target.value)}>
              <option value="draft">草稿</option>
              <option value="published">已发布</option>
              <option value="archived">已归档</option>
            </select>
          </label>
          <label>
            上传图片或视频
            <input type="file" accept="image/*,video/mp4,video/webm,video/ogg" onChange={handleUpload} disabled={uploadingMedia} />
          </label>
        </aside>

        <section className="panel editor-panel">
          <div className="editor-toolbar">
            <div className="button-row">
              <button type="button" className="ghost-button" onClick={() => insertSnippet("h2")}>二级标题</button>
              <button type="button" className="ghost-button" onClick={() => insertSnippet("code")}>代码</button>
              <button type="button" className="ghost-button" onClick={() => insertSnippet("quote")}>引用</button>
              <button type="button" className="ghost-button" onClick={() => insertSnippet("video")}>嵌入视频</button>
            </div>
            <div className="segmented-control">
              <button type="button" className={previewMode === "edit" ? "is-active" : ""} onClick={() => setPreviewMode("edit")}>编辑</button>
              <button type="button" className={previewMode === "split" ? "is-active" : ""} onClick={() => setPreviewMode("split")}>分屏</button>
              <button type="button" className={previewMode === "preview" ? "is-active" : ""} onClick={() => setPreviewMode("preview")}>预览</button>
            </div>
          </div>

          <div className={"markdown-grid markdown-grid--" + previewMode}>
            {previewMode !== "preview" ? (
              <textarea
                ref={textareaRef}
                className="markdown-input"
                value={form.markdown}
                onChange={(event) => updateField("markdown", event.target.value)}
                onPaste={handlePaste}
                onDragOver={handleDragOver}
                onDragLeave={() => setDraggingMedia(false)}
                onDrop={handleDrop}
                data-dragging-media={draggingMedia ? "true" : "false"}
              />
            ) : null}
            {previewMode !== "edit" ? (
              <div className="preview-panel">
                <div className="preview-topline">
                  <span>网页预览</span>
                  <span>{form.markdown.length} 字</span>
                </div>
                <div ref={previewBodyRef} className="preview-body" dangerouslySetInnerHTML={{ __html: previewHtml }} />
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  );
}
