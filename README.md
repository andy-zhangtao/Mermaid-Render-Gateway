# Mermaid Render Gateway

高性能的 Mermaid 图表渲染服务，支持将 Mermaid 代码转换为图片。

## ✨ 特性

- 🚀 **高性能**: 基于 Fastify + Playwright
- 🎨 **多主题**: 支持 default/dark/neutral 主题
- 📱 **跨平台**: 支持 Linux/macOS/Windows Docker 部署
- 🔧 **智能检测**: 自动检测系统 Chrome/Chromium
- 📦 **容器化**: 完整的 Docker 和 docker-compose 支持

## 🚀 快速开始

### 使用 Makefile（推荐）

```bash
# 查看所有可用命令
make help

# 安装依赖并启动开发服务器
make install
make dev

# 构建并启动生产服务器
make start

# 构建 Docker 镜像
make docker-build

# 运行 Docker 容器
make docker-run
```

### 传统方式

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

## 🐳 Docker 部署

### 单容器部署

```bash
# 构建镜像（自动检测平台架构）
make docker-build

# 运行容器
make docker-run

# 查看日志
make docker-logs
```

### Docker Compose 部署

```bash
# 启动完整服务栈
make docker-compose-up

# 查看日志
make docker-compose-logs

# 停止服务
make docker-compose-down
```

## 📋 Makefile 命令参考

### 开发环境
- `make install` - 安装依赖
- `make build` - 构建 TypeScript 项目
- `make dev` - 启动开发服务器
- `make start` - 启动生产服务器
- `make clean` - 清理构建文件

### Docker 构建
- `make docker-info` - 显示 Docker 构建信息
- `make docker-build` - 构建当前平台镜像
- `make docker-build-multi` - 构建多平台镜像
- `make docker-run` - 运行容器
- `make docker-stop` - 停止容器

### 镜像管理
- `make docker-push` - 推送镜像到仓库
- `make docker-cleanup` - 清理本地镜像

### 工具和调试
- `make setup-chrome` - 设置 Chrome 浏览器
- `make health-check` - 健康检查
- `make load-test` - 简单负载测试
- `make env-info` - 显示环境信息

## 🎯 API 使用

### 渲染 Mermaid 图表

```bash
curl -X POST http://localhost:3000/render \
  -H "Content-Type: application/json" \
  -d '{
    "mermaid": "graph TD; A-->B; B-->C;",
    "format": "base64",
    "options": {
      "theme": "default",
      "width": 800,
      "height": 600,
      "backgroundColor": "#ffffff"
    }
  }'
```

### 健康检查

```bash
curl http://localhost:3000/health
```

## ⚙️ 配置

### 环境变量

```bash
# 服务器配置
PORT=3000
NODE_ENV=production

# Chrome 浏览器路径（可选，系统会自动检测）
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# 渲染配置
RENDER_TIMEOUT=30000
MAX_CONCURRENT_RENDERS=5
```

### Chrome 配置

系统会按以下优先级查找浏览器：
1. 用户指定的 `CHROME_PATH` 环境变量
2. 自动检测系统安装的 Chrome/Chromium
3. 使用 Playwright 内置 Chromium

## 🏗️ 架构设计

```
src/
├── controllers/     # API 控制器
├── services/       # 渲染服务
├── types/          # TypeScript 类型
└── index.ts        # 主入口文件

scripts/
└── setup-chrome.js # Chrome 自动检测脚本
```

## 📊 性能参考

对于 **10 QPS** 的访问量：

- **推荐配置**: 8C12G
- **最小配置**: 4C8G  
- **内存需求**: ~8-10GB（包含浏览器实例）
- **CPU需求**: 8核心（2.5GHz+）

## 🔧 故障排除

### Chrome 相关问题

```bash
# 检查 Chrome 检测状态
make setup-chrome

# 查看环境信息
make env-info

# 手动指定 Chrome 路径
export CHROME_PATH="/path/to/chrome"
make start
```

### Docker 相关问题

```bash
# 查看容器日志  
make docker-logs

# 进入容器调试
make docker-shell

# 清理并重新构建
make docker-cleanup
make docker-build
```

## 📝 许可证

ISC License