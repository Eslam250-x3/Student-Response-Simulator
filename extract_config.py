#!/usr/bin/env python3
"""
Extract config objects from GAS (Google Apps Script) .js files.
Handles: getTestConfig() from config.js, getFlowConfig() from config_flow.js
Strips JS comments, uses bracket counting for object extraction, outputs valid JSON.
"""

import re
import json
from pathlib import Path


def strip_js_comments(text: str) -> str:
    """
    Strip JavaScript comments from text.
    - Single-line: // ... to end of line
    - Multi-line: /* ... */
    Preserves string contents (comments inside strings are not stripped).
    """
    result = []
    i = 0
    n = len(text)
    in_single = False
    in_double = False
    in_template = False
    escape_next = False
    in_single_line_comment = False
    in_multi_line_comment = False
    multi_star = False

    while i < n:
        c = text[i]

        if escape_next:
            result.append(c)
            escape_next = False
            i += 1
            continue

        if in_single_line_comment:
            if c == '\n':
                in_single_line_comment = False
                result.append(c)
            i += 1
            continue

        if in_multi_line_comment:
            if multi_star and c == '/':
                in_multi_line_comment = False
                multi_star = False
                i += 1
                continue
            multi_star = (c == '*')
            i += 1
            continue

        if not in_single and not in_double and not in_template:
            if i + 1 < n:
                two = text[i:i+2]
                if two == '//':
                    in_single_line_comment = True
                    i += 2
                    continue
                if two == '/*':
                    in_multi_line_comment = True
                    i += 2
                    continue

        if c == '\\' and (in_single or in_double):
            escape_next = True
            result.append(c)
            i += 1
            continue

        if c == "'" and not in_double and not in_template:
            in_single = not in_single
        elif c == '"' and not in_single and not in_template:
            in_double = not in_double
        elif c == '`' and not in_single and not in_double:
            in_template = not in_template

        result.append(c)
        i += 1

    return ''.join(result)


def find_return_object(text: str, func_name: str) -> str | None:
    """
    Find function getXxx() and extract the object from `return { ... };`
    Uses bracket counting to find the matching closing brace.
    """
    # Match: function getTestConfig() or function getFlowConfig()
    pattern = rf'function\s+{re.escape(func_name)}\s*\([^)]*\)\s*\{{'
    match = re.search(pattern, text)
    if not match:
        return None

    start = match.end()
    # Find first 'return' after function start
    return_match = re.search(r'\breturn\s+\{', text[start:])
    if not return_match:
        return None

    obj_start = start + return_match.start() + len('return ')
    brace_start = obj_start + text[obj_start:].find('{')
    if brace_start < obj_start:
        return None

    # Bracket counting
    depth = 1
    i = brace_start + 1
    n = len(text)
    in_string = False
    string_char = None
    escape = False
    in_regex = False
    in_template = False
    template_depth = 0

    while i < n and depth > 0:
        c = text[i]

        if escape:
            escape = False
            i += 1
            continue

        if c == '\\' and (in_string or in_template):
            escape = True
            i += 1
            continue

        if not in_string and not in_regex and not in_template:
            if c == '{':
                depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0:
                    return text[brace_start:i + 1]
            elif c in '"\'':
                in_string = True
                string_char = c
            elif c == '`':
                in_template = True
            elif c == '/':
                # Could be regex or division - simplified: treat as start of regex if prev char suggests it
                prev = text[i-1] if i > 0 else ' '
                if prev in '=(:,![&|?{}\n;' or (prev == ')' and 'return' in text[max(0,i-50):i]):
                    in_regex = True
        elif in_string:
            if c == string_char:
                in_string = False
        elif in_regex:
            if c == '/' and text[i-1] != '\\':
                in_regex = False
            elif c == '\n':
                in_regex = False
        elif in_template:
            if c == '`':
                in_template = False
            elif c == '{':
                template_depth += 1
            elif c == '}' and template_depth > 0:
                template_depth -= 1

        i += 1

    return None


def js_object_to_json(js_str: str) -> str:
    """
    Convert JavaScript object literal to valid JSON.
    - Removes trailing commas before } or ]
    - Handles other common JS-only constructs if needed
    """
    # Remove trailing commas (before } or ])
    s = re.sub(r',(\s*[}\]])', r'\1', js_str)
    return s


def extract_config(js_path: Path, func_name: str, out_path: Path | None = None) -> dict | None:
    """
    Extract config from a .js file and optionally save as JSON.
    Returns parsed dict or None on failure.
    """
    content = js_path.read_text(encoding='utf-8')
    no_comments = strip_js_comments(content)
    obj_str = find_return_object(no_comments, func_name)
    if not obj_str:
        return None

    json_str = js_object_to_json(obj_str)
    try:
        data = json.loads(json_str)
    except json.JSONDecodeError as e:
        # Fallback: try to fix common issues
        json_str = re.sub(r",\s*}", "}", json_str)
        json_str = re.sub(r",\s*]", "]", json_str)
        try:
            data = json.loads(json_str)
        except json.JSONDecodeError:
            raise ValueError(f"Failed to parse extracted object: {e}") from e

    if out_path:
        out_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    return data


def main():
    base = Path(__file__).parent

    # config.js -> getTestConfig()
    config_js = base / "config.js"
    if config_js.exists():
        data = extract_config(config_js, "getTestConfig", base / "test_config.json")
        if data:
            print("[OK] Extracted getTestConfig() -> test_config.json")
            print(f"  Keys: {list(data.keys())}")
        else:
            print("[FAIL] Failed to extract getTestConfig()")
    else:
        print("[SKIP] config.js not found")

    # config_flow.js -> getFlowConfig()
    flow_js = base / "config_flow.js"
    if flow_js.exists():
        data = extract_config(flow_js, "getFlowConfig", base / "flow_config.json")
        if data:
            print("[OK] Extracted getFlowConfig() -> flow_config.json")
            print(f"  Keys: {list(data.keys())}")
        else:
            print("[FAIL] Failed to extract getFlowConfig()")
    else:
        print("[SKIP] config_flow.js not found")


if __name__ == "__main__":
    main()
