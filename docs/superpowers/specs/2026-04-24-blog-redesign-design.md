# Blog Redesign Design — 2026-04-24

## Scope

重做现有个人博客 MVP 的功能闭环和前端体验，不切换技术栈：

- 后端继续使用 FastAPI + SQLModel + SQLite。
- 公开站继续使用 Next.js / React。
- 管理后台继续使用 React + Vite。
- 内容正文继续使用 Markdown 文件，元数据继续进入数据库。

## Goals

1. 公开站达到可长期使用的阅读体验：响应式布局、系统主题、分类/标签筛选、左右下边栏区域、文章详情和代码复制。
2. 管理后台达到真正可用：登录、文章统计、列表筛选、编辑、预览、上传、发布、下线、删除、边栏配置。
3. 后端补齐最小必要能力：文章删除、上传校验、非法 session 不 500、公开 HTML 清洗。
4. 保持核心简洁，避免引入新依赖和复杂 CMS 抽象。

## Non-goals

- 不做多用户权限。
- 不做评论系统。
- 不做全文搜索。
- 不引入 PostgreSQL / Alembic。
- 不做拖拽式页面搭建。

## Architecture

### Backend

- `routers/admin.py`：后台文章、边栏、媒体、认证接口。
- `routers/public.py`：公开站读取文章、分类、标签、边栏。
- `services.py`：Markdown 文件读写、文章序列化、上传校验、sidebar 序列化。
- `markdown_utils.py`：Markdown 渲染、代码块复制 HTML、HTML 白名单清洗。

### Public frontend

- `BlogShell` 负责整体站点框架：顶部、hero、左/右/底部区域。
- `ArticleList` 负责文章卡片和阅读入口。
- `ArticleBody` 负责安全 HTML 注入后的代码复制行为。
- `CategoryFilter` 和 `TagCloud` 负责筛选。
- CSS 采用变量系统，默认跟随系统深浅色，并支持用户切换。

### Admin frontend

- `App.jsx` 仅保留路由和启动认证。
- `components/` 放 Shell 与提示组件。
- `pages/` 拆出 Login、ArticleList、ArticleEditor、Sidebar。
- `lib/` 放 API、表单转换、格式化工具。

## Acceptance

- 后端 pytest 通过。
- 前端现有 node tests 通过。
- JS/JSX 文件可被 Babel parser 解析。
- Next/Vite build 如在当前沙箱触发 spawn EPERM，记录为环境限制，不作为代码失败依据。
