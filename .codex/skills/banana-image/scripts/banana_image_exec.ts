#!/usr/bin/env npx tsx
/**
 * Banana Image - Gemini AI 图片生成执行脚本
 * 直接调用 Gemini API，不依赖 MCP 服务
 */

import { GoogleGenAI, Part } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import { ProxyAgent, setGlobalDispatcher } from "undici";

// 配置代理支持
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
if (proxyUrl) {
  const dispatcher = new ProxyAgent(proxyUrl);
  setGlobalDispatcher(dispatcher);
}

// ============================================================================
// 类型定义
// ============================================================================

interface BananaImageOptions {
  prompt: string;
  model?: "flash" | "pro";
  aspectRatio?: string;
  resolution?: string;
  negativePrompt?: string;
  outputDir?: string;
  enableGrounding?: boolean;
  inputImage?: string;
  systemInstruction?: string;
  count?: number;
}

interface GeneratedImage {
  path: string;
  width?: number;
  height?: number;
  model: string;
  prompt: string;
}

interface BananaImageResult {
  success: boolean;
  images?: GeneratedImage[];
  error?: string;
  metadata?: {
    model: string;
    aspectRatio?: string;
    resolution?: string;
    duration: number;
  };
}

// ============================================================================
// 常量
// ============================================================================

const MODEL_MAP = {
  flash: "gemini-2.5-flash-image",
  pro: "gemini-3-pro-image-preview",
} as const;

const VALID_ASPECT_RATIOS = [
  "1:1",
  "2:3",
  "3:2",
  "3:4",
  "4:3",
  "4:5",
  "5:4",
  "9:16",
  "16:9",
  "21:9",
];

const VALID_RESOLUTIONS = ["1K", "2K", "4K"];

const DEFAULT_OUTPUT_DIR = path.join(process.cwd(), "images");

// ============================================================================
// 工具函数
// ============================================================================

function generateFilename(prefix: string = "banana"): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}.png`;
}

function ensureOutputDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadImageAsBase64(imagePath: string): string {
  const buffer = fs.readFileSync(imagePath);
  return buffer.toString("base64");
}

function getMimeType(imagePath: string): string {
  const ext = path.extname(imagePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };
  return mimeTypes[ext] || "image/png";
}

// ============================================================================
// 核心生成逻辑
// ============================================================================

async function generateImages(
  options: BananaImageOptions,
): Promise<BananaImageResult> {
  const startTime = Date.now();

  // 验证 API Key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: "GEMINI_API_KEY environment variable is not set",
    };
  }

  // 参数处理
  const modelTier = options.model || "pro";
  const modelName = MODEL_MAP[modelTier];
  const outputDir = options.outputDir || DEFAULT_OUTPUT_DIR;
  const aspectRatio = options.aspectRatio || "1:1";
  const resolution = options.resolution || (modelTier === "pro" ? "4K" : "1K");
  const count = Math.min(options.count || 1, 4);

  // 验证参数
  if (
    options.aspectRatio &&
    !VALID_ASPECT_RATIOS.includes(options.aspectRatio)
  ) {
    return {
      success: false,
      error: `Invalid aspect ratio: ${options.aspectRatio}. Valid: ${VALID_ASPECT_RATIOS.join(", ")}`,
    };
  }

  if (
    options.resolution &&
    !VALID_RESOLUTIONS.includes(options.resolution.toUpperCase())
  ) {
    return {
      success: false,
      error: `Invalid resolution: ${options.resolution}. Valid: ${VALID_RESOLUTIONS.join(", ")}`,
    };
  }

  ensureOutputDir(outputDir);

  try {
    // 支持自定义 API 地址（如第三方代理）
    const apiBase = process.env.GEMINI_API_BASE || process.env.GOOGLE_API_BASE;
    const aiConfig: { apiKey: string; httpOptions?: { baseUrl: string } } = { apiKey };
    if (apiBase) {
      aiConfig.httpOptions = { baseUrl: apiBase };
    }
    const ai = new GoogleGenAI(aiConfig);

    // 构建内容
    const contents: (string | Part)[] = [];

    // 添加系统指令
    if (options.systemInstruction) {
      contents.push(options.systemInstruction);
    }

    // 添加输入图片（编辑模式）
    if (options.inputImage && fs.existsSync(options.inputImage)) {
      const imageData = loadImageAsBase64(options.inputImage);
      const mimeType = getMimeType(options.inputImage);
      contents.push({
        inlineData: {
          data: imageData,
          mimeType,
        },
      });
    }

    // 构建提示词
    let fullPrompt = options.prompt;
    if (options.negativePrompt) {
      fullPrompt += `\n\nAvoid: ${options.negativePrompt}`;
    }
    contents.push(fullPrompt);

    // 构建配置
    // 注意：只有 Pro 模型支持 imageConfig 和 tools
    const config: Record<string, unknown> = {};

    if (modelTier === "pro") {
      // Pro 模型支持宽高比和分辨率配置
      config.imageConfig = {
        aspectRatio,
        imageSize: resolution.toUpperCase(),
      };

      // Google Search grounding
      if (options.enableGrounding) {
        config.tools = [{ googleSearch: {} }];
      }
    }
    // Flash 模型不支持 imageConfig，使用默认配置

    // 调用 API
    const generatedImages: GeneratedImage[] = [];

    for (let i = 0; i < count; i++) {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: contents.length === 1 ? contents[0] : contents,
        config,
      });

      // 提取图片
      const candidates = response.candidates || [];
      for (const candidate of candidates) {
        const parts = candidate.content?.parts || [];
        for (const part of parts) {
          if ("inlineData" in part && part.inlineData?.data) {
            const filename = generateFilename(`banana_${modelTier}`);
            const filePath = path.join(outputDir, filename);

            // 保存图片
            const buffer = Buffer.from(part.inlineData.data, "base64");
            fs.writeFileSync(filePath, buffer);

            generatedImages.push({
              path: filePath,
              model: modelName,
              prompt: options.prompt,
            });
          }
        }
      }
    }

    if (generatedImages.length === 0) {
      return {
        success: false,
        error: "No images were generated. The content may have been filtered.",
      };
    }

    const duration = Date.now() - startTime;

    return {
      success: true,
      images: generatedImages,
      metadata: {
        model: modelName,
        aspectRatio,
        resolution,
        duration,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Image generation failed: ${errorMessage}`,
    };
  }
}

// ============================================================================
// CLI 入口
// ============================================================================

function printUsage(): void {
  console.log(`
Banana Image - Gemini AI 图片生成

Usage:
  npx tsx banana_image_exec.ts [options]

Options:
  --prompt, -p <text>      图片描述（必需）
  --model, -m <type>       模型选择: flash | pro (默认: pro)
  --aspect-ratio, -a <r>   宽高比: 1:1, 16:9, 9:16, 4:3, 3:2, 21:9 等
  --resolution, -r <res>   分辨率: 1K, 2K, 4K (默认: Pro=4K, Flash=1K)
  --negative, -n <text>    排除内容描述
  --output, -o <dir>       输出目录 (默认: ./images)
  --grounding, -g          启用 Google Search 锚定 (仅 Pro)
  --input, -i <path>       输入图片路径（编辑模式）
  --system, -s <text>      系统指令
  --count, -c <num>        生成数量 (1-4)
  --help, -h               显示帮助

Examples:
  # 快速生成
  npx tsx banana_image_exec.ts -p "可爱的柴犬" -m flash

  # 4K 高质量
  npx tsx banana_image_exec.ts -p "专业产品照片" -m pro -r 4K -a 4:5

  # 编辑图片
  npx tsx banana_image_exec.ts -p "将背景改为黄昏" -i /path/to/image.png
`);
}

function parseArgs(): BananaImageOptions | null {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printUsage();
    return null;
  }

  const options: BananaImageOptions = {
    prompt: "",
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case "--prompt":
      case "-p":
        options.prompt = next || "";
        i++;
        break;
      case "--model":
      case "-m":
        if (next === "flash" || next === "pro") {
          options.model = next;
        }
        i++;
        break;
      case "--aspect-ratio":
      case "-a":
        options.aspectRatio = next;
        i++;
        break;
      case "--resolution":
      case "-r":
        options.resolution = next;
        i++;
        break;
      case "--negative":
      case "-n":
        options.negativePrompt = next;
        i++;
        break;
      case "--output":
      case "-o":
        options.outputDir = next;
        i++;
        break;
      case "--grounding":
      case "-g":
        options.enableGrounding = true;
        break;
      case "--input":
      case "-i":
        options.inputImage = next;
        i++;
        break;
      case "--system":
      case "-s":
        options.systemInstruction = next;
        i++;
        break;
      case "--count":
      case "-c":
        options.count = parseInt(next, 10) || 1;
        i++;
        break;
    }
  }

  if (!options.prompt) {
    console.error("Error: --prompt is required");
    printUsage();
    return null;
  }

  return options;
}

async function main(): Promise<void> {
  const options = parseArgs();
  if (!options) {
    process.exit(1);
  }

  const result = await generateImages(options);
  console.log(JSON.stringify(result, null, 2));

  if (!result.success) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ success: false, error: String(error) }));
  process.exit(1);
});
