#!/bin/bash

# GitHub Action 构建触发脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 显示帮助信息
show_help() {
    echo -e "${BLUE}GitHub Action 构建触发脚本${NC}"
    echo ""
    echo "用法:"
    echo "  $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -t, --type TYPE        构建类型 (development|staging|production)"
    echo "  -p, --push             推送镜像到仓库 (默认: true)"
    echo "  --no-push              不推送镜像到仓库"
    echo "  -h, --help             显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 -t production -p"
    echo "  $0 --type development --no-push"
    echo ""
}

# 默认参数
BUILD_TYPE="development"
PUSH_TO_REGISTRY="true"

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--type)
            BUILD_TYPE="$2"
            shift 2
            ;;
        -p|--push)
            PUSH_TO_REGISTRY="true"
            shift
            ;;
        --no-push)
            PUSH_TO_REGISTRY="false"
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}未知选项: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# 验证构建类型
if [[ ! "$BUILD_TYPE" =~ ^(development|staging|production)$ ]]; then
    echo -e "${RED}错误: 无效的构建类型 '$BUILD_TYPE'${NC}"
    echo -e "${YELLOW}支持的类型: development, staging, production${NC}"
    exit 1
fi

# 检查 gh CLI 是否安装
if ! command -v gh &> /dev/null; then
    echo -e "${RED}错误: 未找到 GitHub CLI (gh)${NC}"
    echo -e "${YELLOW}请安装: https://cli.github.com/${NC}"
    exit 1
fi

# 检查是否已登录 GitHub
if ! gh auth status &> /dev/null; then
    echo -e "${RED}错误: 未登录 GitHub CLI${NC}"
    echo -e "${YELLOW}请运行: gh auth login${NC}"
    exit 1
fi

# 获取当前仓库信息
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "")
if [[ -z "$REPO" ]]; then
    echo -e "${RED}错误: 未找到 GitHub 仓库信息${NC}"
    echo -e "${YELLOW}请确保在 Git 仓库目录中运行此脚本${NC}"
    exit 1
fi

BRANCH=$(git branch --show-current)

echo -e "${BLUE}🚀 触发 GitHub Action 构建${NC}"
echo -e "${YELLOW}仓库: $REPO${NC}"
echo -e "${YELLOW}分支: $BRANCH${NC}"
echo -e "${YELLOW}构建类型: $BUILD_TYPE${NC}"
echo -e "${YELLOW}推送镜像: $PUSH_TO_REGISTRY${NC}"
echo ""

# 确认是否继续
read -p "是否继续? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}取消构建${NC}"
    exit 0
fi

# 触发 GitHub Action
echo -e "${GREEN}正在触发构建...${NC}"

if gh workflow run docker-build.yml \
    -f build_type="$BUILD_TYPE" \
    -f push_to_registry="$PUSH_TO_REGISTRY"; then
    
    echo -e "${GREEN}✅ 构建已成功触发!${NC}"
    echo ""
    echo -e "${BLUE}查看构建状态:${NC}"
    echo "  网页: https://github.com/$REPO/actions"
    echo "  命令: gh run list --workflow=docker-build.yml"
    echo ""
    echo -e "${BLUE}查看实时日志:${NC}"
    echo "  命令: gh run watch"
    
else
    echo -e "${RED}❌ 构建触发失败${NC}"
    exit 1
fi