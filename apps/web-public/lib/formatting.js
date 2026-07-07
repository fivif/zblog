export function formatDisplayDate(input) {
  if (!input) return "未发布";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "未发布";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
