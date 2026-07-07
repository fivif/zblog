export function ArticleToc({ items }) {
  if (!items?.length) return null;

  return (
    <nav className="sidebar-card toc-card" aria-label="文章目录">
      <div className="sidebar-card-header">
        <h3>段落导航</h3>
        <span>{items.length} 节</span>
      </div>
      <ol className="toc-tree">
        {items.map((item) => (
          <li key={item.id} className={"toc-node toc-node--level-" + item.level}>
            <a href={"#" + item.id}>{item.text}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
