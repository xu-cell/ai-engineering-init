#!/usr/bin/env python3
"""
批量图片生成准备脚本
将文本文件（每行一个 prompt）或 CSV 转换为 JSON 格式的 prompt 列表
"""

import sys
import json
import csv
import argparse
from pathlib import Path


def parse_text_file(filepath: Path) -> list[dict]:
    """解析纯文本文件，每行一个 prompt"""
    prompts = []
    with open(filepath, "r", encoding="utf-8") as f:
        for i, line in enumerate(f, 1):
            line = line.strip()
            if line and not line.startswith("#"):
                prompts.append({"id": i, "prompt": line})
    return prompts


def parse_csv_file(filepath: Path, prompt_column: str = "prompt") -> list[dict]:
    """解析 CSV 文件，提取指定列作为 prompt"""
    prompts = []
    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader, 1):
            prompt = row.get(prompt_column) or row.get(list(row.keys())[0])
            if prompt and prompt.strip():
                entry = {"id": i, "prompt": prompt.strip()}
                # 保留其他列作为参数
                for key, value in row.items():
                    if key != prompt_column and value:
                        entry[key] = value
                prompts.append(entry)
    return prompts


def main():
    parser = argparse.ArgumentParser(
        description="将文本或 CSV 文件转换为批量生成的 JSON 格式"
    )
    parser.add_argument("file", help="输入文件路径")
    parser.add_argument(
        "--column", "-c", default="prompt", help="CSV 中 prompt 所在列名 (默认: prompt)"
    )
    parser.add_argument("--output", "-o", help="输出文件路径 (默认: 标准输出)")

    args = parser.parse_args()
    filepath = Path(args.file)

    if not filepath.exists():
        print(json.dumps({"error": f"文件不存在: {filepath}"}))
        sys.exit(1)

    try:
        if filepath.suffix.lower() == ".csv":
            prompts = parse_csv_file(filepath, args.column)
        else:
            prompts = parse_text_file(filepath)

        result = {"source": str(filepath), "count": len(prompts), "prompts": prompts}

        output = json.dumps(result, ensure_ascii=False, indent=2)

        if args.output:
            with open(args.output, "w", encoding="utf-8") as f:
                f.write(output)
            print(f"已保存到: {args.output}")
        else:
            print(output)

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
