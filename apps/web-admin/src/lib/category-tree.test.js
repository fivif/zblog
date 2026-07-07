import assert from "node:assert/strict";

import { categoryDisplayName, collectCategorySubtreeIds, flattenCategories } from "./category-tree.js";

const tree = [
  {
    id: 1,
    name: "技术",
    slug: "tech",
    depth: 0,
    children: [
      {
        id: 2,
        name: "前端",
        slug: "frontend",
        children: [{ id: 3, name: "React", slug: "react", children: [] }],
      },
    ],
  },
  { id: 4, name: "生活", slug: "life", children: [] },
];

const flat = flattenCategories(tree);

assert.deepEqual(
  flat.map((category) => [category.slug, category.depth]),
  [
    ["tech", 0],
    ["frontend", 1],
    ["react", 2],
    ["life", 0],
  ],
);

assert.equal(categoryDisplayName(flat[2]), "— — React");
assert.deepEqual([...collectCategorySubtreeIds(flat[0])], [1, 2, 3]);
assert.deepEqual([...collectCategorySubtreeIds(null)], []);

console.log("web-admin category-tree test passed");
