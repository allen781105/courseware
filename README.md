# 交互式课件生成平台

一个基于 Gemini 文生文/图能力的对话式课件生成系统。前端使用 Vite + React + TypeScript 构建交互界面，后端通过 Fastify 暴露生成接口，并将生成结果渲染成可直接使用的 HTML 课件。

## 功能亮点

- 采集课程主题、受众、教学目标等信息，并生成结构化课程大纲
- 结合 Gemini 文生图能力，为每个课程章节生成配套插图与互动设计
- 将课程内容与配图渲染成完整的 HTML 课件，便于导出与展示
- 提供健康检查接口，方便监控后端服务状态

## 仓库结构

- `frontend/`：前端应用，负责需求采集、结果展示与课件预览
- `backend/`：Node.js 服务端，封装与 Gemini API 的交互逻辑
- `env.example`：根目录环境变量示例文件（汇总前后端所需变量）


## 前置条件

- Node.js ≥ 18
- 一个可用的 Gemini API Key

## 环境变量

项目根目录提供 `env.example`，复制后按照实际情况填写敏感信息：

```bash
cp env.example .env            # 如果希望统一管理
```

关键变量说明：

- `GEMINI_API_KEY`：访问 Gemini 文生文/图接口所需的密钥
- `CORS_ORIGIN`：允许访问后端的前端地址（默认 `http://localhost:5173`）
- `VITE_API_URL`：前端调用后端 API 的基础地址（默认指向本地后端）

> ⚠️ 正式环境请勿提交 `.env` 等敏感文件，可参考仓库内的 `.gitignore` 配置。

## 快速开始

### 1. 启动后端

```bash
cd backend
cp env.example .env
npm install
npm run dev
```

默认监听 `http://localhost:3001`，提供以下接口：

- `GET /health`：健康检查
- `POST /api/outline`：生成课程大纲
- `POST /api/courseware`：生成课件内容及 HTML

### 2. 启动前端

```bash
cd frontend
cp env.example .env
npm install
npm run dev
```

Vite 开发服务器通常运行在 `http://localhost:5173`，自动代理到后端 API。

## 常用脚本

后端：

- `npm run dev`：开发模式（基于 `ts-node-dev` 热重载）
- `npm run build`：编译 TypeScript 至 `dist/`
- `npm start`：运行编译后的产物

前端：

- `npm run dev`：开发模式（Vite）
- `npm run build`：产出静态文件到 `dist/`
- `npm run preview`：预览构建结果

## 示例展示

仓库的 `examples/` 目录提供了两份示例课件，可直接在浏览器打开预览：

- `examples/奇妙大自然探险记.html`：主题式互动课程示例
- `examples/奇妙的大自然（带交互式问题）.html`：包含互动问答的课件版本

> 如果你在仓库中添加新的示例记得同步更新本小节，保证链接始终有效。

## 部署提示

- 当前后端依赖 Fastify 与 Node.js 原生模块，不适用于 Cloudflare Workers、Vercel Edge 等纯 Serverless 环境，需要部署在完整 Node 运行时（如自建服务器、Render、Fly.io 等）。
- 前端为纯静态资源，可部署到任意静态托管平台（Netlify、Vercel Static、Cloudflare Pages 等），注意将 `VITE_API_URL` 指向后端地址。

## 后续规划

- 优化大纲编辑功能
- 加入用户身份管理、作品保存等功能
- 优化课件导出体验，支持多格式输出

---

如有问题或建议，欢迎提交 Issue 或 Pull Request。谢谢使用！
