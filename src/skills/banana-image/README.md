<p align="center">
  <img src="assets/logo.png" alt="Banana Image Logo" width="280">
</p>

<h1 align="center">Banana Image</h1>

<p align="center">
  <strong>AI-Powered Image Generation Tool for Claude Code</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#models">Models</a> •
  <a href="#examples">Examples</a>
</p>

---

## Features

- **Dual Model Support** - Flash (fast) and Pro (high-quality 4K)
- **Flexible Aspect Ratios** - 1:1, 16:9, 9:16, 4:3, 2:3, 21:9, and more
- **Image Editing** - Modify existing images with text prompts
- **Batch Generation** - Generate up to 4 variants at once
- **Proxy Support** - Works behind corporate firewalls
- **Claude Code Integration** - Seamless skill integration

## Installation

### 1. Set API Key

```bash
export GEMINI_API_KEY="your-api-key"
```

### 2. Install Dependencies

```bash
cd ~/.claude/skills/banana-image/scripts
npm install
```

## Usage

### Quick Start

```bash
# Fast generation (Flash model)
npx tsx ~/.claude/skills/banana-image/scripts/banana_image_exec.ts \
  -p "A cute shiba inu in the park" -m flash

# 4K high-quality (Pro model)
npx tsx ~/.claude/skills/banana-image/scripts/banana_image_exec.ts \
  -p "Professional product photo: iPhone case" -m pro -r 4K -a 4:5
```

### CLI Options

| Option               | Description                     | Default          |
| -------------------- | ------------------------------- | ---------------- |
| `-p, --prompt`       | Image description (required)    | -                |
| `-m, --model`        | Model: `flash` or `pro`         | `pro`            |
| `-a, --aspect-ratio` | Ratio: 1:1, 16:9, 9:16, etc.    | `1:1`            |
| `-r, --resolution`   | Resolution: 1K, 2K, 4K          | Pro=4K, Flash=1K |
| `-o, --output`       | Output directory                | `./images`       |
| `-n, --negative`     | Negative prompt                 | -                |
| `-i, --input`        | Input image (edit mode)         | -                |
| `-c, --count`        | Number of images (1-4)          | `1`              |
| `-g, --grounding`    | Enable Google Search (Pro only) | `false`          |

## Models

| Model     | Speed  | Max Resolution | Best For                                |
| --------- | ------ | -------------- | --------------------------------------- |
| **Flash** | 2-5s   | 1024px         | Drafts, iterations, prototypes          |
| **Pro**   | 10-40s | 4K             | Final delivery, marketing, professional |

## Examples

### Image Generation

```bash
# 16:9 landscape poster
npx tsx banana_image_exec.ts -p "Sunset over mountains" -m pro -r 4K -a 16:9

# Portrait for social media
npx tsx banana_image_exec.ts -p "Product showcase" -m pro -a 9:16
```

### Image Editing

```bash
# Edit existing image
npx tsx banana_image_exec.ts -p "Change background to beach sunset" -i ./photo.png
```

### Batch Generation

```bash
# Generate 4 variants
npx tsx banana_image_exec.ts -p "Logo design concept" -m pro -c 4
```

## Output

```json
{
  "success": true,
  "images": [
    {
      "path": "./images/banana_pro_2025-01-01T12-00-00_abc123.png",
      "model": "gemini-3-pro-image-preview",
      "prompt": "Your prompt"
    }
  ],
  "metadata": {
    "model": "gemini-3-pro-image-preview",
    "aspectRatio": "16:9",
    "resolution": "4K",
    "duration": 15234
  }
}
```

## Aspect Ratio Guide

| Use Case            | Ratio | Keywords                   |
| ------------------- | ----- | -------------------------- |
| Social media square | 1:1   | Instagram, profile         |
| Landscape banner    | 16:9  | YouTube, desktop wallpaper |
| Portrait story      | 9:16  | Stories, mobile wallpaper  |
| Product photo       | 4:5   | E-commerce, catalog        |
| Movie poster        | 2:3   | Poster, print              |
| Ultra-wide          | 21:9  | Banner, header             |

## Requirements

- Node.js 18+
- Gemini API Key
- Network access (proxy supported)

## License

MIT
