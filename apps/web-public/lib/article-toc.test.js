import assert from "node:assert/strict";

import { buildArticleHtmlWithToc } from "./article-toc.js";

const source = `
<h1>正文标题</h1>
<h2>第一段</h2>
<p>内容</p>
<h3>细节 &amp; 例子</h3>
<h4 id="custom-id">已有锚点</h4>
`;

const result = buildArticleHtmlWithToc(source);

assert.match(result.html, /<h1 id="section-1">正文标题<\/h1>/);
assert.match(result.html, /<h2 id="section-2">第一段<\/h2>/);
assert.match(result.html, /<h3 id="section-3">细节 &amp; 例子<\/h3>/);
assert.match(result.html, /<h4 id="custom-id">已有锚点<\/h4>/);
assert.deepEqual(result.toc, [
  { id: "section-1", text: "正文标题", level: 1 },
  { id: "section-2", text: "第一段", level: 2 },
  { id: "section-3", text: "细节 & 例子", level: 3 },
  { id: "custom-id", text: "已有锚点", level: 4 },
]);

console.log("web-public article toc test passed");
