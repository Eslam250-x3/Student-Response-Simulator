"""
استخراج config.js و config_flow.js إلى config.json (مصدر واحد للحقيقة).
شغّل مرة واحدة للترحيل، ثم عدّل config.json يدوياً.
"""
import re
import json
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


def strip_js_comments(txt):
    """يزيل تعليقات // و /* */ من النص."""
    result = []
    i = 0
    n = len(txt)
    in_single = False
    in_multi = False
    in_string = False
    escape = False
    while i < n:
        c = txt[i]
        if escape:
            if in_string:
                result.append(c)
            escape = False
            i += 1
            continue
        if c == "\\" and in_string:
            escape = True
            result.append(c)
            i += 1
            continue
        if in_single:
            if c == "\n":
                in_single = False
                result.append(c)
            i += 1
            continue
        if in_multi:
            if c == "*" and i + 1 < n and txt[i + 1] == "/":
                in_multi = False
                i += 2
            else:
                i += 1
            continue
        if not in_string:
            if c == "/" and i + 1 < n:
                nxt = txt[i + 1]
                if nxt == "/":
                    in_single = True
                    i += 2
                    continue
                if nxt == "*":
                    in_multi = True
                    i += 2
                    continue
            if c in ('"', "'"):
                in_string = c
                result.append(c)
                i += 1
                continue
        elif c == in_string:
            in_string = False
            result.append(c)
            i += 1
            continue
        result.append(c)
        i += 1
    return "".join(result)


def find_return_object(txt, func_name):
    """يستخرج الكائن من return {...};"""
    pattern = r"function\s+" + re.escape(func_name) + r"\s*\([^)]*\)\s*\{"
    m = re.search(pattern, txt)
    if not m:
        return None
    start = m.end()
    ret = re.search(r"\breturn\s+\{", txt[start:])
    if not ret:
        return None
    obj_start = start + ret.end() - 1
    depth = 0
    i = obj_start
    in_str = None
    escape = False
    n = len(txt)
    while i < n:
        c = txt[i]
        if escape:
            escape = False
            i += 1
            continue
        if c == "\\" and in_str:
            escape = True
            i += 1
            continue
        if in_str:
            if c == in_str:
                in_str = None
            i += 1
            continue
        if c in ('"', "'"):
            in_str = c
            i += 1
            continue
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return txt[obj_start : i + 1]
        i += 1
    return None


def js_to_json(s):
    """يحول كائن JS إلى JSON صالح (يزيل الفواصل الزائدة)."""
    s = re.sub(r",(\s*[}\]])", r"\1", s)
    return s


def extract_config(path):
    with open(path, "r", encoding="utf-8-sig") as f:
        txt = f.read()
    txt = strip_js_comments(txt)
    obj = find_return_object(txt, "getTestConfig")
    if not obj:
        raise ValueError("Could not find getTestConfig return object")
    return json.loads(js_to_json(obj))


def extract_flow_config(path):
    with open(path, "r", encoding="utf-8-sig") as f:
        txt = f.read()
    txt = strip_js_comments(txt)
    obj = find_return_object(txt, "getFlowConfig")
    if not obj:
        raise ValueError("Could not find getFlowConfig return object")
    return json.loads(js_to_json(obj))


def extract_students(path):
    with open(path, "r", encoding="utf-8-sig") as f:
        txt = f.read()
    pattern = r'id:\s*"([^"]+)".*?name:\s*"([^"]+)".*?email:\s*"([^"]+)".*?group:\s*"([^"]+)"'
    matches = re.findall(pattern, txt, re.DOTALL)
    return [{"id": m[0], "name": m[1], "email": m[2], "group": m[3]} for m in matches]


def main():
    config_path = os.path.join(SCRIPT_DIR, "config.js")
    flow_path = os.path.join(SCRIPT_DIR, "config_flow.js")
    students_path = os.path.join(SCRIPT_DIR, "students.js")

    config = extract_config(config_path)
    flow = extract_flow_config(flow_path)
    students = extract_students(students_path)

    out = {
        "settings": config.get("settings", {}),
        "testInfo": config.get("testInfo", {}),
        "questions": config.get("questions", []),
        "skillsBreakdown": config.get("skillsBreakdown", {}),
        "flow": flow,
        "students": students,
    }

    out_path = os.path.join(SCRIPT_DIR, "config.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print(f"[OK] Created {out_path}")
    print(f"     Questions: {len(out['questions'])}, Flow items: {len(out['flow'].get('items', []))}, Students: {len(out['students'])}")


if __name__ == "__main__":
    main()
