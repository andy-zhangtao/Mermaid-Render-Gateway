# Mermaid Render Gateway - Makefile
# 支持跨平台Docker镜像构建和项目管理

# 项目信息
PROJECT_NAME := mermaid-render-gateway
VERSION := $(shell node -p "require('./package.json').version")
COMMIT_HASH := $(shell git rev-parse --short HEAD)
BUILD_TIME := $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")

# Docker配置
DOCKER_REGISTRY := 
DOCKER_REPO := $(PROJECT_NAME)
IMAGE_NAME := $(if $(DOCKER_REGISTRY),$(DOCKER_REGISTRY)/$(DOCKER_REPO),$(DOCKER_REPO))
IMAGE_TAG := $(VERSION)-$(COMMIT_HASH)

# 平台检测
UNAME_S := $(shell uname -s)
UNAME_M := $(shell uname -m)

# 架构映射
ifeq ($(UNAME_S),Darwin)
	OS := darwin
	ifeq ($(UNAME_M),arm64)
		ARCH := arm64
		DOCKER_PLATFORM := linux/arm64
	else
		ARCH := amd64
		DOCKER_PLATFORM := linux/amd64
	endif
else ifeq ($(UNAME_S),Linux)
	OS := linux
	ifeq ($(UNAME_M),x86_64)
		ARCH := amd64
		DOCKER_PLATFORM := linux/amd64
	else ifeq ($(UNAME_M),aarch64)
		ARCH := arm64
		DOCKER_PLATFORM := linux/arm64
	else
		ARCH := $(UNAME_M)
		DOCKER_PLATFORM := linux/$(UNAME_M)
	endif
else
	OS := windows
	ARCH := amd64
	DOCKER_PLATFORM := linux/amd64
endif

# 颜色输出
RED := \033[31m
GREEN := \033[32m
YELLOW := \033[33m
BLUE := \033[34m
PURPLE := \033[35m
CYAN := \033[36m
WHITE := \033[37m
RESET := \033[0m

# 默认目标
.DEFAULT_GOAL := help

##@ 帮助信息
.PHONY: help
help: ## 显示帮助信息
	@echo "$(CYAN)Mermaid Render Gateway - Makefile$(RESET)"
	@echo "$(YELLOW)项目: $(PROJECT_NAME)$(RESET)"
	@echo "$(YELLOW)版本: $(VERSION)$(RESET)"
	@echo "$(YELLOW)平台: $(OS)/$(ARCH)$(RESET)"
	@echo "$(YELLOW)提交: $(COMMIT_HASH)$(RESET)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "使用方法:\n  make $(CYAN)<target>$(RESET)\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  $(CYAN)%-15s$(RESET) %s\n", $$1, $$2 } /^##@/ { printf "\n$(PURPLE)%s$(RESET)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ 开发环境
.PHONY: install
install: ## 安装依赖
	@echo "$(GREEN)📦 安装项目依赖...$(RESET)"
	npm install

.PHONY: build
build: ## 构建TypeScript项目
	@echo "$(GREEN)🔨 构建项目...$(RESET)"
	npm run build

.PHONY: dev
dev: ## 启动开发服务器
	@echo "$(GREEN)🚀 启动开发服务器...$(RESET)"
	npm run dev

.PHONY: start
start: build ## 启动生产服务器
	@echo "$(GREEN)🚀 启动生产服务器...$(RESET)"
	npm start

.PHONY: test
test: ## 运行测试
	@echo "$(GREEN)🧪 运行测试...$(RESET)"
	npm test

.PHONY: clean
clean: ## 清理构建文件
	@echo "$(YELLOW)🧹 清理构建文件...$(RESET)"
	rm -rf dist/
	rm -rf node_modules/
	rm -f .env

##@ Docker构建
.PHONY: docker-info
docker-info: ## 显示Docker构建信息
	@echo "$(CYAN)Docker 构建信息:$(RESET)"
	@echo "  平台: $(DOCKER_PLATFORM)"
	@echo "  镜像: $(IMAGE_NAME):$(IMAGE_TAG)"
	@echo "  架构: $(ARCH)"
	@echo "  系统: $(OS)"

.PHONY: docker-build
docker-build: ## 构建Docker镜像（当前平台）
	@echo "$(GREEN)🐳 构建Docker镜像 [$(DOCKER_PLATFORM)]...$(RESET)"
	docker build \
		--platform $(DOCKER_PLATFORM) \
		--build-arg BUILD_TIME="$(BUILD_TIME)" \
		--build-arg COMMIT_HASH="$(COMMIT_HASH)" \
		--build-arg VERSION="$(VERSION)" \
		-t $(IMAGE_NAME):$(IMAGE_TAG) \
		-t $(IMAGE_NAME):latest \
		.
	@echo "$(GREEN)✅ 镜像构建完成: $(IMAGE_NAME):$(IMAGE_TAG)$(RESET)"

.PHONY: docker-build-multi
docker-build-multi: ## 构建多平台Docker镜像
	@echo "$(GREEN)🐳 构建多平台Docker镜像...$(RESET)"
	docker buildx create --use --name multiarch-builder 2>/dev/null || true
	docker buildx build \
		--platform linux/amd64,linux/arm64 \
		--build-arg BUILD_TIME="$(BUILD_TIME)" \
		--build-arg COMMIT_HASH="$(COMMIT_HASH)" \
		--build-arg VERSION="$(VERSION)" \
		-t $(IMAGE_NAME):$(IMAGE_TAG) \
		-t $(IMAGE_NAME):latest \
		--push \
		.
	@echo "$(GREEN)✅ 多平台镜像构建并推送完成$(RESET)"

.PHONY: docker-run
docker-run: ## 运行Docker容器
	@echo "$(GREEN)🐳 启动Docker容器...$(RESET)"
	docker run -d \
		--name $(PROJECT_NAME) \
		-p 3000:3000 \
		--restart unless-stopped \
		$(IMAGE_NAME):latest
	@echo "$(GREEN)✅ 容器启动成功: http://localhost:3000$(RESET)"

.PHONY: docker-stop
docker-stop: ## 停止Docker容器
	@echo "$(YELLOW)🛑 停止Docker容器...$(RESET)"
	-docker stop $(PROJECT_NAME)
	-docker rm $(PROJECT_NAME)

.PHONY: docker-logs
docker-logs: ## 查看Docker容器日志
	docker logs -f $(PROJECT_NAME)

.PHONY: docker-shell
docker-shell: ## 进入Docker容器Shell
	docker exec -it $(PROJECT_NAME) /bin/sh

##@ 镜像管理
.PHONY: docker-push
docker-push: ## 推送Docker镜像到仓库
	@echo "$(GREEN)📤 推送Docker镜像...$(RESET)"
	docker push $(IMAGE_NAME):$(IMAGE_TAG)
	docker push $(IMAGE_NAME):latest
	@echo "$(GREEN)✅ 镜像推送完成$(RESET)"

.PHONY: docker-pull
docker-pull: ## 从仓库拉取Docker镜像
	@echo "$(GREEN)📥 拉取Docker镜像...$(RESET)"
	docker pull $(IMAGE_NAME):latest

.PHONY: docker-cleanup
docker-cleanup: ## 清理Docker镜像和容器
	@echo "$(YELLOW)🧹 清理Docker资源...$(RESET)"
	-docker stop $(PROJECT_NAME) 2>/dev/null
	-docker rm $(PROJECT_NAME) 2>/dev/null
	-docker rmi $(IMAGE_NAME):$(IMAGE_TAG) 2>/dev/null
	-docker rmi $(IMAGE_NAME):latest 2>/dev/null
	docker system prune -f
	@echo "$(GREEN)✅ Docker清理完成$(RESET)"

##@ 部署和运维
.PHONY: docker-compose-up
docker-compose-up: ## 使用docker-compose启动服务
	@echo "$(GREEN)🐳 启动docker-compose服务...$(RESET)"
	docker-compose up -d

.PHONY: docker-compose-down
docker-compose-down: ## 停止docker-compose服务
	@echo "$(YELLOW)🛑 停止docker-compose服务...$(RESET)"
	docker-compose down

.PHONY: docker-compose-logs
docker-compose-logs: ## 查看docker-compose日志
	docker-compose logs -f

##@ 版本和发布
.PHONY: version
version: ## 显示版本信息
	@echo "$(CYAN)版本信息:$(RESET)"
	@echo "  项目版本: $(VERSION)"
	@echo "  Git提交: $(COMMIT_HASH)"
	@echo "  构建时间: $(BUILD_TIME)"
	@echo "  平台架构: $(OS)/$(ARCH)"

.PHONY: tag
tag: ## 创建Git标签
	@echo "$(GREEN)🏷️  创建Git标签: v$(VERSION)$(RESET)"
	git tag -a v$(VERSION) -m "Release version $(VERSION)"
	git push origin v$(VERSION)

##@ CI/CD辅助
.PHONY: ci-build
ci-build: install build docker-build ## CI环境完整构建流程

.PHONY: ci-test
ci-test: install build test ## CI环境测试流程

.PHONY: release
release: clean install build docker-build-multi docker-push tag ## 完整发布流程

.PHONY: gh-trigger
gh-trigger: ## 触发GitHub Action构建 (需要gh CLI)
	@echo "$(GREEN)🚀 触发GitHub Action构建...$(RESET)"
	./scripts/trigger-build.sh

.PHONY: gh-status
gh-status: ## 查看GitHub Action状态
	@echo "$(GREEN)📊 GitHub Action状态:$(RESET)"
	@gh run list --workflow=docker-build.yml --limit=5 || echo "$(RED)请安装GitHub CLI: gh$(RESET)"

.PHONY: gh-logs
gh-logs: ## 查看最新GitHub Action日志
	@echo "$(GREEN)📋 查看构建日志...$(RESET)"
	@gh run view --log || echo "$(RED)请安装GitHub CLI: gh$(RESET)"

.PHONY: gh-watch
gh-watch: ## 实时监控GitHub Action构建
	@echo "$(GREEN)👀 实时监控构建...$(RESET)"
	@gh run watch || echo "$(RED)请安装GitHub CLI: gh$(RESET)"

##@ 工具和调试
.PHONY: setup-chrome
setup-chrome: ## 设置Chrome浏览器
	@echo "$(GREEN)🔧 设置Chrome浏览器...$(RESET)"
	node scripts/setup-chrome.js

.PHONY: health-check
health-check: ## 健康检查
	@echo "$(GREEN)🏥 执行健康检查...$(RESET)"
	@curl -f http://localhost:3000/health || echo "$(RED)❌ 服务不可用$(RESET)"

.PHONY: load-test
load-test: ## 简单负载测试
	@echo "$(GREEN)⚡ 执行负载测试...$(RESET)"
	@for i in {1..10}; do \
		curl -s -X POST http://localhost:3000/render \
			-H "Content-Type: application/json" \
			-d '{"mermaid":"graph TD; A-->B; B-->C;"}' \
			>/dev/null && echo "✅ 请求 $$i 成功" || echo "❌ 请求 $$i 失败"; \
	done

.PHONY: env-info
env-info: ## 显示环境信息
	@echo "$(CYAN)环境信息:$(RESET)"
	@echo "  操作系统: $(shell uname -a)"
	@echo "  Node.js: $(shell node --version 2>/dev/null || echo '未安装')"
	@echo "  npm: $(shell npm --version 2>/dev/null || echo '未安装')"
	@echo "  Docker: $(shell docker --version 2>/dev/null || echo '未安装')"
	@echo "  Git: $(shell git --version 2>/dev/null || echo '未安装')"