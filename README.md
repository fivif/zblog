# Zay Blog — 个人博客系统

一个以 **Markdown 写作 + 管理后台 + 公开阅读** 为核心的轻量全栈博客系统。

[![Version](https://img.shields.io/badge/version-1.0.0-blue)](https://github.com/fivif/personal-blog/releases)

## 技术栈

| 组件 | 技术 |
|------|------|
| 后端 API | Python 3.11 + FastAPI + SQLModel + SQLite |
| 博客前台 | Next.js 15 + React 19 |
| 管理后台 | React 18 + Vite 6 |
| 包管理 | pnpm 10 (monorepo workspace) |
| 部署 | Docker + docker-compose |

## 功能

### 📖 公开前台
- 文章列表与文章详情
- 分类树形筛选、标签筛选、全文搜索
- Markdown 渲染：代码高亮 + 一键复制、表格、图片、HTML 安全预览
- 文章目录（TOC）自动生成与导航
- 视频播放（Plyr 播放器集成）
- 浏览统计（停留 > 5s 计数）+ 点赞功能
- 系统浅色 / 深色模式，可手动切换
- 侧边栏可折叠、固定滚动、子分类折叠
- 全设备响应式（桌面 / 平板 / 手机）

### 🛠 管理后台
- 首次进入自动初始化：设置管理员账户密码
- 账户管理：登录 / 退出 / 修改用户名密码
- 文章管理：新建、编辑、删除、发布 / 下线 / 归档
- 文章编辑器：Markdown 编辑 + 实时预览（分屏/编辑/预览模式）
- 媒体库：上传图片视频、拖拽粘贴上传、复制 Markdown 引用
- 分类管理：无限层级树形分类、排序、启用/禁用、循环检测
- 标签管理：自动 slug 生成、使用计数、重命名同步
- 边栏配置：左右底三区域、Markdown/HTML/链接组/通知/广告
- 站点设置：标题、副标题
- 信息密度列表：排序、浏览数、点赞数

### 🔒 安全
- bcrypt 密码哈希存储
- HMAC-SHA256 会话令牌 + 恒等时间比较
- Cookie HttpOnly + SameSite=Lax
- bleach HTML 安全白名单过滤
- 文件上传类型校验 + 路径穿越防护

## 快速开始

### 环境要求

- Python 3.11+
- Node.js 22+
- pnpm 10+

### 本地开发

```bash
# 安装前端依赖
pnpm install

# 安装后端依赖
python3.11 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn sqlmodel python-multipart \
  markdown-it-py mdit-py-plugins pygments bleach bcrypt

# 启动 API（端口 8000）
cd apps/api
python -m uvicorn blog_api.main:app --reload --port 8000

# 启动公开前台（端口 3000）
pnpm --filter web-public dev

# 启动管理后台（端口 5173）
pnpm --filter web-admin dev
```

### Docker 部署

```bash
# 复制环境变量
cp .env.example .env
# 编辑 .env 设置密钥和初始密码

# 构建并启动
docker compose up -d

# 启动后访问：
#   公开前台: http://localhost:3000
#   管理后台: http://localhost:8080
#   后端 API: http://localhost:8000
```

### 首次使用

1. 打开后台 `http://localhost:5173`（本地）或 `http://localhost:8080`（Docker）
2. 设置管理员用户名和密码
3. 在「分类管理」和「标签管理」整理内容结构
4. 在「媒体库」上传图片或视频
5. 开始写文章并发布

## 目录结构

```
blog/
├── apps/
│   ├── api/                    # FastAPI 后端
│   │   ├── blog_api/
│   │   │   ├── main.py         # 应用入口 + CORS
│   │   │   ├── config.py       # 环境变量配置
│   │   │   ├── models.py       # SQLModel 数据模型
│   │   │   ├── database.py     # 数据库连接 + 迁移
│   │   │   ├── auth.py         # 认证 + 会话管理
│   │   │   ├── schemas.py      # Pydantic 请求/响应模型
│   │   │   ├── services.py     # 业务逻辑层
│   │   │   ├── markdown_utils.py # Markdown 渲染 + 代码高亮
│   │   │   ├── utils.py        # 工具函数
│   │   │   ├── seed.py         # 初始数据
│   │   │   └── routers/
│   │   │       ├── public.py   # 公开 API
│   │   │       └── admin.py    # 管理 API
│   │   ├── tests/              # pytest 测试
│   │   └── Dockerfile
│   ├── web-public/             # Next.js 博客前台
│   │   ├── app/
│   │   │   ├── layout.jsx      # 根布局 + 元数据
│   │   │   ├── page.jsx        # 首页（文章列表）
│   │   │   └── articles/[slug]/ # 文章详情页
│   │   ├── components/         # React 组件
│   │   │   ├── blog-shell.jsx   # 站点壳（顶栏 + 布局）
│   │   │   ├── article-list.jsx # 文章列表（表格视图）
│   │   │   ├── article-body.jsx # 文章正文（复制、Plyr）
│   │   │   ├── article-toc.jsx  # 文章目录
│   │   │   ├── category-filter.jsx # 分类筛选（可折叠）
│   │   │   ├── tag-cloud.jsx    # 标签云
│   │   │   ├── search-box.jsx   # 搜索框
│   │   │   ├── sidebar-region.jsx # 边栏区域
│   │   │   ├── theme-script.jsx  # 主题初始化脚本
│   │   │   ├── theme-toggle.jsx  # 主题切换按钮
│   │   │   └── view-tracker.jsx  # 浏览计数（5s 停留）
│   │   ├── lib/                # 工具库
│   │   └── Dockerfile
│   └── web-admin/              # React 管理后台
│       ├── src/pages/          # 各功能页面
│       │   ├── SetupPage.jsx   # 首次初始化页
│       │   ├── LoginPage.jsx   # 登录页
│       │   ├── ArticleListPage.jsx
│       │   ├── ArticleEditorPage.jsx # 支持拖拽上传
│       │   ├── CategoryPage.jsx
│       │   ├── TagPage.jsx
│       │   ├── MediaPage.jsx
│       │   ├── SidebarPage.jsx
│       │   └── SettingsPage.jsx # 站点设置 + 改密码
│       └── Dockerfile
├── content/
│   ├── articles/               # Markdown 文章文件
│   └── media/                  # 上传的图片视频
├── packages/contracts/         # 前后端共享常量
├── docs/                       # 设计文档
├── docker-compose.yml          # Docker 编排
└── package.json                # Monorepo 根配置
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `BLOG_ADMIN_USERNAME` | 初始管理员用户名（DB 未配置时使用） | `admin` |
| `BLOG_ADMIN_PASSWORD` | 初始管理员密码（DB 未配置时使用） | `change-me` |
| `BLOG_SECRET_KEY` | 会话令牌签名密钥 | 必须修改 |
| `BLOG_DB_URL` | SQLite 数据库路径 | `sqlite:///./apps/api/blog.db` |
| `BLOG_CONTENT_DIR` | Markdown 文章目录 | `./content/articles` |
| `BLOG_MEDIA_DIR` | 媒体文件目录 | `./content/media` |
| `PUBLIC_API_BASE_URL` | Next.js SSR 请求 API 地址 | `http://localhost:8000` |
| `NEXT_PUBLIC_API_BASE_URL` | 浏览器端 API 地址 | `http://localhost:8000` |
| `VITE_API_BASE_URL` | 管理后台 API 地址 | `http://localhost:8000` |

## API 概览

### 公开 API (`/api/public`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/site-settings` | 站点标题、副标题 |
| GET | `/categories` | 分类树（仅启用的） |
| GET | `/tags` | 所有标签 |
| GET | `/articles` | 文章列表（支持 ?category / ?tag / ?search） |
| GET | `/articles/{slug}` | 文章详情 |
| POST | `/articles/{slug}/view` | 浏览 +1（停留 >5s） |
| POST | `/articles/{slug}/like` | 点赞 +1 |
| GET | `/sidebar-blocks` | 边栏内容块 |

### 管理 API (`/api/admin`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/auth/configured` | 是否已初始化 |
| POST | `/auth/setup` | 首次创建管理员 |
| POST | `/auth/login` | 登录 |
| POST | `/auth/logout` | 退出 |
| POST | `/auth/change-password` | 修改账户密码 |
| — | `/articles` | 文章 CRUD + 发布 / 下线 |
| — | `/categories` | 分类 CRUD |
| — | `/tags` | 标签 CRUD |
| — | `/media` | 媒体列表 / 上传 / 删除 |
| — | `/sidebar-blocks` | 边栏 CRUD |
| — | `/site-settings` | 站点设置读 / 写 |
| — | `/articles/preview` | Markdown 转 HTML 预览 |

## 设计原则

- **正文即文件**：Markdown 文章独立存储，便于迁移、备份、版本控制
- **数据库存元数据**：SQLite 只存分类、标签、统计等结构化数据
- **安全第一**：密码 bcrypt 哈希、HTML 白名单过滤、Cookie 安全标志
- **渐进增强**：JS 禁用时核心内容仍可阅读，JS 启用后提供交互增强
- **响应式优先**：桌面三栏布局 → 平板侧栏可折叠 → 手机单列堆叠

## 许可

MIT
