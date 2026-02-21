"""
يولّد constants.js من constants.json لضمان مصدر واحد لـ DROPOUT_IDS.
شغّل: python sync_constants.py
"""
import json
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONSTANTS_JSON = os.path.join(SCRIPT_DIR, "constants.json")
CONSTANTS_JS = os.path.join(SCRIPT_DIR, "constants.js")

def main():
    with open(CONSTANTS_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)
    ids = data["dropoutIds"]
    js_content = '''// ═══════════════════════════════════════════════════════════════
//  constants.js — مولّد من constants.json (شغّل: python sync_constants.py)
// ═══════════════════════════════════════════════════════════════

const DROPOUT_IDS = %s;
''' % json.dumps(ids)
    with open(CONSTANTS_JS, "w", encoding="utf-8") as f:
        f.write(js_content)
    print(f"[OK] Updated {CONSTANTS_JS} from {CONSTANTS_JSON}")

if __name__ == "__main__":
    main()
