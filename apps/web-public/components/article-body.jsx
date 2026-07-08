"use client";

import { useEffect, useRef, useState } from "react";

function Lightbox({ images, current, onClose, onPrev, onNext }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  if (current === null) return null;

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose}>×</button>
      {images.length > 1 && (
        <>
          <button className="lightbox-nav lightbox-prev" onClick={(e) => { e.stopPropagation(); onPrev(); }}>‹</button>
          <button className="lightbox-nav lightbox-next" onClick={(e) => { e.stopPropagation(); onNext(); }}>›</button>
        </>
      )}
      <img
        src={images[current].src}
        alt={images[current].alt || ""}
        onClick={(e) => e.stopPropagation()}
      />
      <span className="lightbox-counter">{current + 1} / {images.length}</span>
    </div>
  );
}

export function ArticleBody({ html }) {
  const rootRef = useRef(null);
  const playersRef = useRef([]);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    root.querySelectorAll('a[href^="http"]').forEach((anchor) => {
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noopener noreferrer");
    });

    // Init KaTeX for math formulas
    const katexScript = document.createElement("script");
    katexScript.src = "https://cdn.jsdelivr.net/npm/katex@0.16/dist/katex.min.js";
    katexScript.onload = () => {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://cdn.jsdelivr.net/npm/katex@0.16/dist/katex.min.css";
      document.head.appendChild(css);

      if (window.renderMathInElement && root) {
        try {
          window.renderMathInElement(root, {
            delimiters: [
              { left: "$$", right: "$$", display: true },
              { left: "$", right: "$", display: false },
              { left: "\\[", right: "\\]", display: true },
              { left: "\\(", right: "\\)", display: false },
            ],
            throwOnError: false,
          });
        } catch (_) {}
      }
      if (window.renderMathInElement && root) {
        delete window.renderMathInElement;
      }
    };
    // Load auto-render extension
    const autoScript = document.createElement("script");
    autoScript.src = "https://cdn.jsdelivr.net/npm/katex@0.16/dist/contrib/auto-render.min.js";
    autoScript.onload = () => {
      document.head.appendChild(katexScript);
    };
    document.head.appendChild(autoScript);

    // Initialize Plyr on all video elements
    root.querySelectorAll("video").forEach((video) => {
      if (video.closest("[data-plyr]")) return;
      import("plyr").then(({ default: Plyr }) => {
        try {
          video.setAttribute("data-plyr", "");
          const player = new Plyr(video, {
            controls: ["play-large", "play", "progress", "current-time", "mute", "volume", "captions", "settings", "pip", "airplay", "fullscreen"],
            i18n: { restart: "重新播放", rewind: "后退 {seektime}s", play: "播放", pause: "暂停", fastForward: "快进 {seektime}s", seek: "跳转", played: "已播放", buffered: "已缓冲", currentTime: "当前时间", duration: "时长", volume: "音量", mute: "静音", unmute: "取消静音", enableCaptions: "启用字幕", disableCaptions: "关闭字幕", download: "下载", enterFullscreen: "全屏", exitFullscreen: "退出全屏", frameTitle: "视频播放器", settings: "设置", menuBack: "返回上一级菜单", speed: "倍速", normal: "正常", quality: "画质", loop: "循环播放", start: "开始", end: "结束", all: "全部", reset: "重置", disabled: "已禁用", advertisement: "广告" },
          });
          playersRef.current.push(player);
        } catch (_) {}
      });
    });

    // Image lightbox - collect all content images
    const imgs = Array.from(root.querySelectorAll("img")).filter(
      (img) => !img.closest(".code-block-shell") && !img.closest(".plyr")
    );
    setGalleryImages(imgs.map((img, i) => ({ src: img.src, alt: img.alt, index: i })));
    imgs.forEach((img, i) => {
      img.style.cursor = "zoom-in";
      img.addEventListener("click", () => setLightboxIndex(i));
    });

    let copyTimer = null;

    function handleClick(event) {
      const button = event.target.closest(".copy-code-button");
      if (!button || !root.contains(button)) return;
      const targetId = button.dataset.codeTarget;
      const target = targetId ? document.getElementById(targetId) : null;
      if (!target) return;
      navigator.clipboard?.writeText(target.innerText || "");
      const original = button.innerText;
      button.innerText = "已复制";
      if (copyTimer) window.clearTimeout(copyTimer);
      copyTimer = window.setTimeout(() => {
        button.innerText = original;
        copyTimer = null;
      }, 1200);
    }

    root.addEventListener("click", handleClick);
    return () => {
      root.removeEventListener("click", handleClick);
      if (copyTimer) window.clearTimeout(copyTimer);
      playersRef.current.forEach((p) => { try { p.destroy(); } catch (_) {} });
      playersRef.current = [];
    };
  }, [html]);

  return (
    <>
      <div ref={rootRef} className="article-body" dangerouslySetInnerHTML={{ __html: html }} />
      <Lightbox
        images={galleryImages}
        current={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onPrev={() => setLightboxIndex((i) => (i > 0 ? i - 1 : galleryImages.length - 1))}
        onNext={() => setLightboxIndex((i) => (i < galleryImages.length - 1 ? i + 1 : 0))}
      />
    </>
  );
}
