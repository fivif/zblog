# 个人博客系统

一个以 **Markdown 写作 + 后台管理 + 前台阅读** 为核心的轻量博客系统。

- 后端：FastAPI + SQLite + SQLModel
- 前台：Next.js / React
- 后台：React + Vite
- 内容：Markdown 文件保存正文，数据库保存元数据
- 风格：简洁、克制，支持跟随系统浅色 / 深色模式

---

## 当前能力

### 前台

- 文章列表与文章详情页。
- 分类筛选、标签筛选、全文搜索。
- Markdown 渲染，支持：
  - 图片
  - 视频
  - 表格
  - 代码块复制
  - HTML 安全预览
  - 文章目录导航
- 左侧、右侧、底部边栏区域。
- 站点标题、副标题由后台配置。
- Logo 已统一到前台和后台。

### 后台

- 登录会话。
- 文章发布、编辑、删除、发布 / 取消发布。
- 分类管理。
- 标签管理。
- 媒体库：上传、复制 Markdown 引用、删除未使用媒体。
- 边栏配置：留言、通知、广告、链接等。
- 站点设置：标题、副标题。

### API

- 公开 API：文章、分类、标签、边栏、站点设置。
- 管理 API：文章、分类、标签、媒体、边栏、站点设置。
- Markdown 转 HTML 预览。
- 图片 / 视频上传到 `content/media/`。

---

## 目录结构

```text
apps/
  api/          FastAPI 后端
  web-public/   前台站点
  web-admin/    管理后台
content/
  articles/     Markdown 文章
  media/        图片和视频
packages/
  contracts/    前后端共享常量
scripts/
  start-dev.ps1 一键启动脚本
```

---

## 启动

### 推荐方式

```powershell
pnpm dev
```

或者双击：

```text
start-dev.bat
```

启动后：

```text
API:  http://localhost:8000
前台: http://localhost:3000
后台: http://localhost:5173
```

检查环境：

```powershell
pnpm dev:check
```

### 单独启动

后端：

```powershell
.\venv\Scripts\python.exe -m uvicorn blog_api.main:app --app-dir apps/api --reload --port 8000
```

前台：

```powershell
pnpm --filter web-public dev
```

后台：

```powershell
pnpm --filter web-admin dev
```

---

## 环境变量

复制配置：

```powershell
Copy-Item .env.example .env
```

常用变量：

```text
BLOG_ADMIN_USERNAME
BLOG_ADMIN_PASSWORD
BLOG_SECRET_KEY
BLOG_DB_URL
BLOG_CONTENT_DIR
BLOG_MEDIA_DIR
PUBLIC_API_BASE_URL
VITE_API_BASE_URL
```

---

## 验证

后端测试：

```powershell
$env:PYTHONPATH='apps/api'
.\venv\Scripts\python.exe -m pytest apps/api/tests -q
```

前端测试：

```powershell
pnpm test
```

构建：

```powershell
pnpm build
```

说明：当前 Codex 沙箱下，Next / Vite / esbuild 可能因为 `spawn EPERM` 构建失败；这种情况优先看测试和语法解析结果，不直接判定代码错误。

---

## 使用流程

1. 打开后台：`http://localhost:5173`
2. 登录后台。
3. 在“站点设置”里设置站点标题和副标题。
4. 在“分类管理”和“标签管理”里整理内容结构。
5. 在“媒体库”上传图片或视频，复制 Markdown 引用。
6. 在“写文章”里编写 Markdown，预览 HTML。
7. 发布文章。
8. 打开前台：`http://localhost:3000`

---

## 设计原则

- 正文内容以 Markdown 文件为准，便于迁移和备份。
- 数据库只保存文章元数据、分类、标签、边栏与站点设置。
- 只有 `published` 状态文章会出现在前台。
- HTML 内容经过安全清洗后展示。
- 媒体文件集中存放到 `content/media/`。
- 当前使用 SQLite，后续可迁移 PostgreSQL。

---

## 后续路线

已完成：全文搜索、标签管理、媒体库、文章目录、代码块复制、站点设置。

下一步建议：

1. 阅读进度条与当前目录高亮。
2. 归档页。
3. RSS / sitemap / robots.txt。
4. 备份导入导出。
5. Docker 部署配置。
6. 数据库迁移脚本。
