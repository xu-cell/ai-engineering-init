#!/usr/bin/env bash
# =============================================================================
# RuoYi AI Engineering 初始化脚本
# 用法: ./init.sh [--tool claude|codex|all] [--dir <目标目录>] [--force]
# 远程: bash <(curl -fsSL https://raw.githubusercontent.com/xujiajun/ai-engineering-init/main/init.sh)
# =============================================================================
set -e

# ── 颜色 ──────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ── 常量 ──────────────────────────────────────────────────────────────────────
REPO_URL="https://github.com/xujiajun/ai-engineering-init"
BRANCH="main"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd || echo "${PWD}")"

# ── Banner ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${BLUE}┌─────────────────────────────────────────┐${NC}"
echo -e "${BOLD}${BLUE}│   RuoYi AI Engineering 初始化工具  v1.0  │${NC}"
echo -e "${BOLD}${BLUE}└─────────────────────────────────────────┘${NC}"
echo ""

# ── 解析参数 ──────────────────────────────────────────────────────────────────
TOOL=""
TARGET_DIR="${PWD}"
FORCE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --tool|-t)   TOOL="$2";        shift 2 ;;
    --dir|-d)    TARGET_DIR="$2";  shift 2 ;;
    --force|-f)  FORCE=true;       shift   ;;
    --help|-h)
      echo -e "用法: ${BOLD}init.sh${NC} [选项]"
      echo ""
      echo "选项:"
      echo "  --tool, -t <工具>   指定工具: claude | codex | all"
      echo "  --dir,  -d <目录>   目标目录（默认：当前目录）"
      echo "  --force,-f          强制覆盖已有文件"
      echo "  --help, -h          显示此帮助"
      echo ""
      echo "示例:"
      echo "  ./init.sh --tool claude"
      echo "  ./init.sh --tool all --dir /path/to/project"
      echo "  ./init.sh --tool codex --force"
      echo ""
      exit 0
      ;;
    *) echo -e "${RED}未知参数: $1${NC}"; exit 1 ;;
  esac
done

# ── 交互菜单 ──────────────────────────────────────────────────────────────────
if [ -z "$TOOL" ]; then
  echo -e "${CYAN}请选择要初始化的 AI 工具：${NC}"
  echo ""
  echo -e "  ${BOLD}1${NC}) ${GREEN}Claude Code${NC}   — 初始化 .claude/ + CLAUDE.md"
  echo -e "  ${BOLD}2${NC}) ${YELLOW}OpenAI Codex${NC}  — 初始化 .codex/ + AGENTS.md"
  echo -e "  ${BOLD}3${NC}) ${BLUE}全部工具${NC}       — 同时初始化 Claude + Codex"
  echo ""
  read -rp "$(echo -e "${BOLD}请输入选项 [1-3]: ${NC}")" choice
  case $choice in
    1) TOOL="claude" ;;
    2) TOOL="codex"  ;;
    3) TOOL="all"    ;;
    *) echo -e "${RED}无效选项，退出。${NC}"; exit 1 ;;
  esac
fi

echo ""
echo -e "  目标目录: ${BOLD}${TARGET_DIR}${NC}"
echo -e "  初始化工具: ${BOLD}${TOOL}${NC}"
echo ""

# ── 确定文件来源 ──────────────────────────────────────────────────────────────
if [ -f "${SCRIPT_DIR}/CLAUDE.md" ] || [ -d "${SCRIPT_DIR}/.claude" ]; then
  SOURCE_DIR="${SCRIPT_DIR}"
  echo -e "${GREEN}  ✓ 使用本地仓库文件${NC}"
else
  echo -e "${YELLOW}  → 正在从 GitHub 下载配置文件...${NC}"
  TEMP_DIR=$(mktemp -d)
  # shellcheck disable=SC2064
  trap "rm -rf '${TEMP_DIR}'" EXIT

  if command -v git &>/dev/null; then
    git clone --depth=1 --branch "${BRANCH}" "${REPO_URL}" "${TEMP_DIR}/repo" \
      2>&1 | grep -v "^Cloning" || true
  else
    echo -e "${RED}  ✗ 未找到 git，请先安装 git 或手动克隆仓库:${NC}"
    echo -e "    git clone ${REPO_URL}"
    exit 1
  fi

  SOURCE_DIR="${TEMP_DIR}/repo"
  echo -e "${GREEN}  ✓ 下载完成${NC}"
fi

echo ""
echo -e "${BOLD}正在复制文件...${NC}"
echo ""

# ── 复制函数 ──────────────────────────────────────────────────────────────────
copy_item() {
  local src="$1"
  local dest="$2"
  local label="$3"

  if [ ! -e "${src}" ]; then
    echo -e "${YELLOW}  ⚠  ${label} 在源目录中不存在，跳过${NC}"
    return
  fi
  if [ -e "${dest}" ] && [ "$FORCE" = false ]; then
    echo -e "${YELLOW}  ⚠  ${label} 已存在，跳过（--force 可强制覆盖）${NC}"
    return
  fi
  if [ -d "${src}" ]; then
    cp -r "${src}" "${dest}"
  else
    cp "${src}" "${dest}"
  fi
  echo -e "${GREEN}  ✓  ${label}${NC}"
}

# ── 初始化函数 ────────────────────────────────────────────────────────────────
init_claude() {
  echo -e "${CYAN}[Claude Code]${NC}"
  copy_item "${SOURCE_DIR}/.claude"   "${TARGET_DIR}/.claude"   ".claude/ 目录"
  copy_item "${SOURCE_DIR}/CLAUDE.md" "${TARGET_DIR}/CLAUDE.md" "CLAUDE.md"
}

init_codex() {
  echo -e "${CYAN}[OpenAI Codex]${NC}"
  copy_item "${SOURCE_DIR}/.codex"    "${TARGET_DIR}/.codex"    ".codex/ 目录"
  copy_item "${SOURCE_DIR}/AGENTS.md" "${TARGET_DIR}/AGENTS.md" "AGENTS.md"
}

# ── 执行初始化 ────────────────────────────────────────────────────────────────
case "$TOOL" in
  claude) init_claude ;;
  codex)  init_codex  ;;
  all)    init_claude; echo ""; init_codex ;;
  *)
    echo -e "${RED}无效的工具类型: ${TOOL}${NC}"
    echo -e "${YELLOW}有效选项: claude | codex | all${NC}"
    exit 1
    ;;
esac

# ── 完成提示 ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}✅ 初始化完成！${NC}"
echo ""

case "$TOOL" in
  claude|all)
    echo -e "${CYAN}Claude Code 使用：${NC}"
    echo -e "  1. 按需修改 ${BOLD}CLAUDE.md${NC} 中的项目信息"
    echo -e "  2. 在 Claude Code 中输入 ${BOLD}/start${NC} 快速了解项目"
    echo -e "  3. 输入 ${BOLD}/dev${NC} 开始开发新功能"
    echo ""
    ;;
esac

case "$TOOL" in
  codex|all)
    echo -e "${CYAN}Codex 使用：${NC}"
    echo -e "  1. 按需修改 ${BOLD}AGENTS.md${NC} 中的项目说明"
    echo -e "  2. 在 Codex 中使用 .codex/skills/ 下的技能"
    echo ""
    ;;
esac
