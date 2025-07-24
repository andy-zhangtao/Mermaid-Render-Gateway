# Multi-stage build for Mermaid Render Gateway
# 支持多平台架构 (linux/amd64, linux/arm64)

####################
# Stage 1: Builder
####################
FROM node:18-alpine AS builder

# 安装构建依赖
RUN apk add --no-cache python3 make g++

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装所有依赖（包含devDependencies用于构建）
RUN npm ci && npm cache clean --force

# 复制源码
COPY . .

# 构建TypeScript项目
RUN npm run build

####################
# Stage 2: Runtime
####################
FROM node:18-alpine AS runtime

# 构建参数
ARG BUILD_TIME
ARG COMMIT_HASH  
ARG VERSION

# 环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV BUILD_TIME=${BUILD_TIME}
ENV COMMIT_HASH=${COMMIT_HASH}
ENV VERSION=${VERSION}

# 添加标签
LABEL maintainer="Mermaid Render Gateway Team"
LABEL version="${VERSION}"
LABEL description="High-performance Mermaid diagram rendering service"
LABEL build-time="${BUILD_TIME}"
LABEL commit="${COMMIT_HASH}"

# 安装系统依赖和Chromium
RUN apk add --no-cache \
    # Chromium和依赖
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    # 工具
    curl \
    dumb-init \
    # 清理
    && rm -rf /var/cache/apk/*

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# 设置工作目录
WORKDIR /app

# 复制package文件并安装仅生产依赖
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# 从builder阶段复制构建文件
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

# 设置Chrome路径
ENV CHROME_PATH=/usr/bin/chromium-browser
ENV CHROMIUM_PATH=/usr/bin/chromium-browser

# Playwright环境变量
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLES_PATH=/usr/bin/chromium-browser

# 创建必要目录
RUN mkdir -p /app/tmp && chown nextjs:nodejs /app/tmp

# 切换到非root用户
USER nextjs

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# 暴露端口
EXPOSE ${PORT}

# 启动命令
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]