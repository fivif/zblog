export function flattenCategories(categories = []) {
  const flat = [];

  function visit(category, depth = category.depth || 0) {
    flat.push({ ...category, depth });
    (category.children || []).forEach((child) => visit(child, depth + 1));
  }

  categories.forEach((category) => visit(category, category.depth || 0));
  return flat;
}

export function categoryDisplayName(category) {
  return "— ".repeat(category.depth || 0) + category.name;
}

export function collectCategorySubtreeIds(category) {
  const ids = new Set();

  function visit(item) {
    if (!item?.id || ids.has(item.id)) return;
    ids.add(item.id);
    (item.children || []).forEach(visit);
  }

  visit(category);
  return ids;
}
