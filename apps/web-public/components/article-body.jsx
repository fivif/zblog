"use client";

import { useEffect, useRef } from "react";

export function ArticleBody({ html }) {
  const rootRef = useRef(null);
  const playersRef = useRef([]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    root.querySelectorAll('a[href^="http"]').forEach((anchor) => {
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noopener noreferrer");
    });

    // Initialize Plyr on all video elements
    let plyr = null;
    root.querySelectorAll("video").forEach((video) => {
      if (video.closest("[data-plyr]")) return; // already initialized
      import("plyr").then(({ default: Plyr }) => {
        try {
          video.setAttribute("data-plyr", "");
          const player = new Plyr(video, {
            controls: ["play-large", "play", "progress", "current-time", "mute", "volume", "captions", "settings", "pip", "airplay", "fullscreen"],
            i18n: { restart: "重新播放", rewind: "后退 {seektime}s", play: "播放", pause: "暂停", fastForward: "快进 {seektime}s", seek: "跳转", played: "已播放", buffered: "已缓冲", currentTime: "当前时间", duration: "时长", volume: "音量", mute: "静音", unmute: "取消静音", enableCaptions: "启用字幕", disableCaptions: "关闭字幕", download: "下载", enterFullscreen: "全屏", exitFullscreen: "退出全屏", frameTitle: "视频播放器", settings: "设置", menuBack: "返回上一级菜单", speed: "倍速", normal: "正常", quality: "画质", loop: "循环播放", start: "开始", end: "结束", all: "全部", reset: "重置", disabled: "已禁用", advertisement: "广告" },
          });
          playersRef.current.push(player);
        } catch (_) { /* video not supported */ }
      });
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

  return <div ref={rootRef} className="article-body" dangerouslySetInnerHTML={{ __html: html }} />;
}
