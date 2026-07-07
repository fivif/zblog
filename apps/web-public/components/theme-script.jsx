"use client";

export function ThemeProviderScript() {
  const script = `
    (() => {
      const saved = window.localStorage.getItem('blog-theme-mode') || 'system';
      const query = window.matchMedia('(prefers-color-scheme: dark)');
      const resolved = saved === 'system' ? (query.matches ? 'dark' : 'light') : saved;
      document.documentElement.dataset.theme = resolved;
      document.documentElement.dataset.themeMode = saved;
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
