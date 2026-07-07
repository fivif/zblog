export function formatDisplayDate(input) {
  if (!input) return "未发布";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "未发布";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function compactCount(items, status) {
  return items.filter((item) => item.status === status).length;
}

export function statusLabel(status) {
  return {
    draft: "草稿",
    published: "已发布",
    archived: "已归档",
  }[status] || status;
}

export function sidebarTypeLabel(type) {
  return {
    markdown: "Markdown",
    notice: "通知",
    html: "HTML",
    "link-group": "链接组",
    ad: "广告",
  }[type] || type;
}

export function sidebarRegionLabel(region) {
  return {
    left: "左侧",
    right: "右侧",
    bottom: "底部",
  }[region] || region;
}
