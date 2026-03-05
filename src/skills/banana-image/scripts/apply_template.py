#!/usr/bin/env python3
"""
模板应用脚本
读取模板 JSON 并填充占位符，输出完整的生成参数
"""

import sys
import json
import argparse
import re
from pathlib import Path


TEMPLATES_DIR = Path(__file__).parent.parent / "templates"


def list_templates() -> list[dict]:
    """列出所有可用模板"""
    templates = []
    for f in TEMPLATES_DIR.glob("*.json"):
        try:
            with open(f, "r", encoding="utf-8") as file:
                data = json.load(file)
                templates.append(
                    {
                        "file": f.name,
                        "name": data.get("name", f.stem),
                        "description": data.get("description", ""),
                    }
                )
        except Exception:
            continue
    return templates


def load_template(name: str) -> dict:
    """加载指定模板"""
    # 尝试直接文件名
    template_path = TEMPLATES_DIR / f"{name}.json"
    if not template_path.exists():
        # 尝试匹配名称
        for f in TEMPLATES_DIR.glob("*.json"):
            with open(f, "r", encoding="utf-8") as file:
                data = json.load(file)
                if data.get("name") == name:
                    return data
        raise FileNotFoundError(f"模板不存在: {name}")

    with open(template_path, "r", encoding="utf-8") as f:
        return json.load(f)


def apply_template(template: dict, values: dict) -> dict:
    """应用模板，填充占位符"""
    prompt = template["prompt_template"]

    # 替换占位符
    for key, value in values.items():
        prompt = prompt.replace(f"{{{{{key}}}}}", value)

    # 检查未填充的占位符
    missing = re.findall(r"\{\{(\w+)\}\}", prompt)
    if missing:
        placeholders = template.get("placeholders", {})
        required = [m for m in missing if not placeholders.get(m, {}).get("optional")]
        if required:
            raise ValueError(f"缺少必需的占位符: {', '.join(required)}")
        # 移除可选占位符
        for m in missing:
            prompt = prompt.replace(f"{{{{{m}}}}}", "")

    # 构建结果
    result = {"prompt": prompt.strip(), **template.get("defaults", {})}

    return result


def main():
    parser = argparse.ArgumentParser(description="应用模板生成图片参数")
    subparsers = parser.add_subparsers(dest="command", help="子命令")

    # list 子命令
    subparsers.add_parser("list", help="列出所有模板")

    # apply 子命令
    apply_parser = subparsers.add_parser("apply", help="应用模板")
    apply_parser.add_argument("template", help="模板名称")
    apply_parser.add_argument(
        "--values",
        "-v",
        type=str,
        help='JSON 格式的占位符值，如: {"product": "coffee maker"}',
    )
    apply_parser.add_argument("--output", "-o", help="输出文件路径")

    args = parser.parse_args()

    if args.command == "list":
        templates = list_templates()
        print(json.dumps(templates, ensure_ascii=False, indent=2))

    elif args.command == "apply":
        try:
            template = load_template(args.template)
            values = json.loads(args.values) if args.values else {}
            result = apply_template(template, values)

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

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
