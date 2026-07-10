# Zblog — 全栈个人博客系统

Markdown 写作 + 管理后台 + 公开阅读的轻量博客系统。

[![Version](https://img.shields.io/badge/version-1.0.0-blue)](https://github.com/fivif/zblog/releases)

## 技术栈

| 组件 | 技术 |
|------|------|
| 后端 API | Python 3.11 + FastAPI + SQLModel + SQLite |
| 博客前台 | Next.js 15 + React 19 |
| 管理后台 | React 18 + Vite 6 |
| 包管理 | pnpm 10 (monorepo) |
| 部署 | Docker + docker-compose + Nginx |

## 功能

- 📝 Markdown 写作 + 实时预览 + 代码高亮复制
- 🌳 无限层级分类树 + 标签系统
- 🔍 全文搜索
- 📊 浏览统计（停留 >5s 计数）+ 点赞
- 🎬 Plyr 视频播放器
- 🎨 系统浅色/深色模式 + 侧栏折叠
- 📱 全设备响应式（手机侧栏抽屉）
- 🔒 bcrypt 密码哈希 + 首次初始化引导
- 📁 媒体上传 + 拖拽粘贴
- 🖼 自定义站点图标
- 🐳 一键 Docker 部署

## Docker 部署（推荐）

### 1. 准备服务器

```bash
# 需要 Docker 和 docker compose
docker --version        # >= 20.10
docker compose version  # >= 2.0
```

### 2. 拉取项目

```bash
git clone https://github.com/fivif/zblog.git /opt/zblog
cd /opt/zblog
```

### 3. 配置环境变量

```bash
cp .env.example .env
# 修改 BLOG_SECRET_KEY 为随机字符串
openssl rand -hex 32  # 生成密钥填入 .env
```

```ini
# .env 关键配置
BLOG_SECRET_KEY=<生成的随机密钥>
BLOG_ADMIN_USERNAME=admin      # 初始管理员（DB未配置时使用）
BLOG_ADMIN_PASSWORD=change-me   # 初始密码（首次登录后立即在后台修改）
```

### 4. 启动服务

```bash
# 构建并启动所有服务
docker compose up -d --build

# 查看运行状态
docker compose ps
```

### 5. 配置 Nginx 反向代理

以 `blog.xzay.de`（前台）和 `adblog.xzay.de`（后台）为例：

```nginx
# 前台博客
server {
    listen 443 ssl http2;
    server_name blog.xzay.de;
    ssl_certificate     /ssl/your-domain/fullchain.pem;
    ssl_certificate_key /ssl/your-domain/privkey.pem;
    client_max_body_size 500M;

    location /api/   { proxy_pass http://127.0.0.1:8001; proxy_set_header Host $host; }
    location /media/ { proxy_pass http://127.0.0.1:8001; proxy_set_header Host $host; }
    location /       { proxy_pass http://127.0.0.1:3030; proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto $scheme; }
}

# 管理后台
server {
    listen 443 ssl http2;
    server_name adblog.xzay.de;
    ssl_certificate     /ssl/your-domain/fullchain.pem;
    ssl_certificate_key /ssl/your-domain/privkey.pem;
    client_max_body_size 500M;

    location / { proxy_pass http://127.0.0.1:8080; proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto $scheme; }
}

server {
    listen 80;
    server_name blog.xzay.de adblog.xzay.de;
    return 301 https://$host$request_uri;
}
```

> 如果使用 1Panel，将上述配置放到 `/etc/nginx/conf.d/` 目录下。

### 6. 首次使用

1. 打开 `https://blog.xzay.de`（前台）
2. 打开 `https://adblog.xzay.de`（后台）
3. 首次进入后台会提示设置**管理员账户和密码**
4. 在「分类管理」和「标签管理」整理内容结构
5. 在「站点设置」配置标题、副标题、图标
6. 开始写文章并发布

### 更新部署

```bash
cd /opt/zblog
git pull
docker compose up -d --build
```

### Docker 服务端口

| 服务 | 容器名 | 对外端口 | 内部端口 |
|------|--------|----------|----------|
| API | blog-api | `127.0.0.1:8001` | 8000 |
| 前台 | blog-web | `127.0.0.1:3030` | 3000 |
| 后台 | blog-admin | `0.0.0.0:8080` | 80 |

## 本地开发

### 环境要求

- Python 3.11+
- Node.js 22+
- pnpm 10+

### 启动

```bash
# 安装依赖
pnpm install
python3.11 -m venv venv && source venv/bin/activate
pip install fastapi uvicorn sqlmodel python-multipart markdown-it-py mdit-py-plugins pygments bleach bcrypt

# 启动 API（:8000）
cd apps/api && python -m uvicorn blog_api.main:app --reload --port 8000

# 启动前台（:3000）
pnpm --filter web-public dev

# 启动后台（:5173）
pnpm --filter web-admin dev
```

### 运行测试

```bash
# 后端
PYTHONPATH=apps/api venv/bin/python -m pytest apps/api/tests -q

# 前端
pnpm test
```

## 目录结构

```
├── apps/
│   ├── api/                    # FastAPI 后端
│   │   ├── blog_api/
│   │   │   ├── main.py         # 应用入口
│   │   │   ├── config.py       # 环境变量配置
│   │   │   ├── models.py       # SQLModel 数据模型
│   │   │   ├── auth.py         # bcrypt 认证 + 会话管理
│   │   │   ├── services.py     # 业务逻辑层
│   │   │   ├── markdown_utils.py # Markdown 渲染 + 代码高亮
│   │   │   └── routers/        # 公开 API + 管理 API
│   │   ├── tests/
│   │   └── Dockerfile
│   ├── web-public/             # Next.js 博客前台
│   │   ├── app/                # 页面 (首页 + 文章详情)
│   │   ├── components/         # React 组件
│   │   └── Dockerfile
│   └── web-admin/              # React 管理后台
│       ├── src/pages/          # 各功能页面
│       └── Dockerfile
├── content/                    # Markdown 文章 + 媒体文件
├── packages/contracts/         # 前后端共享常量
├── docker-compose.yml          # Docker 编排
└── .env.example                # 环境变量模板
```

## API 概览

### 公开 API (`/api/public`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/site-settings` | 站点配置 |
| GET | `/categories` | 分类树 |
| GET | `/tags` | 所有标签 |
| GET | `/articles?category=&tag=&search=` | 文章列表（支持筛选搜索） |
| GET | `/articles/{slug}` | 文章详情 |
| POST | `/articles/{slug}/view` | 浏览 +1 |
| POST | `/articles/{slug}/like` | 点赞 +1 |
| GET | `/sidebar-blocks` | 边栏内容 |

### 管理 API (`/api/admin`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/auth/configured` | 是否已初始化 |
| POST | `/auth/setup` | 首次创建管理员 |
| POST | `/auth/login` | 登录 |
| POST | `/auth/logout` | 退出 |
| POST | `/auth/change-password` | 修改账户密码 |
| CRUD | `/articles` | 文章管理 |
| CRUD | `/categories` | 分类管理 |
| CRUD | `/tags` | 标签管理 |
| CRUD | `/sidebar-blocks` | 边栏配置 |
| CRUD | `/site-settings` | 站点设置 |
| GET/POST/DELETE | `/media` | 媒体上传管理 |
| POST | `/articles/preview` | Markdown 预览 |

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `BLOG_ADMIN_USERNAME` | 初始管理员 | `admin` |
| `BLOG_ADMIN_PASSWORD` | 初始密码 | `change-me` |
| `BLOG_SECRET_KEY` | 会话签名密钥 | 必须修改 |
| `BLOG_DB_URL` | 数据库路径 | `sqlite:///./apps/api/blog.db` |
| `BLOG_CONTENT_DIR` | 文章目录 | `./content/articles` |
| `BLOG_MEDIA_DIR` | 媒体目录 | `./content/media` |
| `PUBLIC_API_BASE_URL` | SSR API 地址 | `http://localhost:8000` |
| `NEXT_PUBLIC_API_BASE_URL` | 浏览器 API 地址 | `http://localhost:8000` |

## 许可

MIT

## 致谢

感谢 [Linux DO](https://linux.do/) 社区的支持。
