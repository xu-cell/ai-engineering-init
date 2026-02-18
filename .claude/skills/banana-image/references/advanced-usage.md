# 高级用法参考

## 批量生成工作流

### 1. 准备 prompt 列表

**纯文本格式** (`prompts.txt`):

```
可爱的柴犬在公园里玩耍
专业产品照片：iPhone 手机壳
科幻风格的城市夜景
```

**CSV 格式** (`prompts.csv`):

```csv
prompt,aspect_ratio,model
可爱的柴犬,1:1,flash
专业产品照片,4:5,pro
科幻城市,16:9,pro
```

### 2. 转换为 JSON

```bash
python ~/.claude/skills/banana-image/scripts/batch_prep.py prompts.txt
```

输出：

```json
{
  "source": "prompts.txt",
  "count": 3,
  "prompts": [
    { "id": 1, "prompt": "可爱的柴犬在公园里玩耍" },
    { "id": 2, "prompt": "专业产品照片：iPhone 手机壳" },
    { "id": 3, "prompt": "科幻风格的城市夜景" }
  ]
}
```

### 3. Claude 批量生成

Claude 读取 JSON 后逐个调用 `banana_image_exec.ts`：

```bash
# 对每个 prompt 执行
npx tsx ~/.claude/skills/banana-image/scripts/banana_image_exec.ts \
  -p "可爱的柴犬在公园里玩耍" \
  -m pro
```

## 模板系统

### 列出可用模板

```bash
python ~/.claude/skills/banana-image/scripts/apply_template.py list
```

### 应用模板

```bash
python ~/.claude/skills/banana-image/scripts/apply_template.py apply product \
  -v '{"product": "sleek wireless earbuds"}'
```

输出：

```json
{
  "prompt": "Create a professional, high-end product photography shot of sleek wireless earbuds...",
  "model_tier": "pro",
  "resolution": "4k",
  "aspect_ratio": "4:5",
  "enable_grounding": true
}
```

然后使用输出参数调用 `banana_image_exec.ts`：

```bash
npx tsx ~/.claude/skills/banana-image/scripts/banana_image_exec.ts \
  -p "Create a professional, high-end product photography shot of sleek wireless earbuds..." \
  -m pro -r 4K -a 4:5 -g
```

## 图片编辑模式

### 编辑现有图片

```bash
npx tsx ~/.claude/skills/banana-image/scripts/banana_image_exec.ts \
  -p "Make the background a sunset beach scene" \
  -i /path/to/original.png
```

### 风格迁移

```bash
npx tsx ~/.claude/skills/banana-image/scripts/banana_image_exec.ts \
  -p "Transform this photo into a Studio Ghibli anime style" \
  -i /path/to/photo.jpg \
  -m pro
```

## 参数优化技巧

### 提高质量

1. 使用 Pro 模型：`-m pro`
2. 使用 4K 分辨率：`-r 4K`
3. 启用 Google 搜索锚定：`-g`
4. 详细的提示词描述

### 加快速度

1. 使用 Flash 模型：`-m flash`
2. 降低分辨率：`-r 1K`
3. 简化提示词

### Negative Prompt 示例

```bash
npx tsx ~/.claude/skills/banana-image/scripts/banana_image_exec.ts \
  -p "Professional portrait photo of a business person" \
  -n "blurry, low quality, distorted, watermark, text, cartoon" \
  -m pro
```

## 输出目录管理

默认输出目录：`~/.claude/banana-image-output/`

自定义输出目录：

```bash
npx tsx ~/.claude/skills/banana-image/scripts/banana_image_exec.ts \
  -p "产品图" \
  -o /path/to/custom/output
```

## 常见问题

### Q: 生成失败，提示安全过滤？

尝试：

1. 使用更中性的描述
2. 避免敏感词汇
3. 使用 `--negative` 排除不当内容

### Q: 图片质量不够？

1. 使用 Pro 模型：`-m pro`
2. 提高分辨率：`-r 4K`
3. 优化提示词，添加更多细节描述

### Q: 如何生成多张变体？

```bash
npx tsx ~/.claude/skills/banana-image/scripts/banana_image_exec.ts \
  -p "产品照片" \
  -c 4
```

### Q: 如何查看已生成的图片？

```bash
ls -la ~/.claude/banana-image-output/
```

## 环境变量

| 变量             | 说明            | 必需 |
| ---------------- | --------------- | ---- |
| `GEMINI_API_KEY` | Gemini API 密钥 | 是   |

设置方式：

```bash
# 临时设置
export GEMINI_API_KEY="your-api-key"

# 永久设置（添加到 ~/.zshrc 或 ~/.bashrc）
echo 'export GEMINI_API_KEY="your-api-key"' >> ~/.zshrc
```
