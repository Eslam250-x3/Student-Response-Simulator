"""
يولّد config.js و config_flow.js من config.json (مصدر واحد للحقيقة).
شغّل قبل clasp push عند تعديل config.json.

الاستخدام:
  python generate_config_js.py
"""
import json
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_JSON = os.path.join(SCRIPT_DIR, "config.json")
CONFIG_JS = os.path.join(SCRIPT_DIR, "config.js")
CONFIG_FLOW_JS = os.path.join(SCRIPT_DIR, "config_flow.js")


def js_string_escape(s):
    """يهرب النص للاستخدام داخل سلسلة JavaScript بصيغة '...'"""
    return s.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n").replace("\r", "\\r")


def main():
    with open(CONFIG_JSON, "r", encoding="utf-8") as f:
        config = json.load(f)

    # config.js: getTestConfig returns settings, testInfo, questions, skillsBreakdown
    test_config = {
        "settings": config.get("settings", {}),
        "testInfo": config.get("testInfo", {}),
        "questions": config.get("questions", []),
        "skillsBreakdown": config.get("skillsBreakdown", {}),
    }
    config_str = json.dumps(test_config, ensure_ascii=False)
    config_str_escaped = js_string_escape(config_str)

    config_js_content = '''// ════════════════════════════════════════════════════════════════
//  config.js — مولّد من config.json (شغّل: python generate_config_js.py)
// ════════════════════════════════════════════════════════════════

function getTestConfig() {
  return JSON.parse(''' + "'" + config_str_escaped + "'" + ''');
}

function saveConfigToDrive() {
  const config = getTestConfig();
  const json = JSON.stringify(config, null, 2);
  const file = DriveApp.createFile('test_config.json', json, 'application/json');
  Logger.log("✅ تم الحفظ: " + file.getUrl());
  Logger.log("🆔 ID: " + file.getId());
  return file.getId();
}

function loadConfigFromDrive(fileId) {
  try {
    const file = DriveApp.getFileById(fileId);
    return JSON.parse(file.getBlob().getDataAsString());
  } catch (e) {
    Logger.log("❌ خطأ: " + e.message);
    return getTestConfig();
  }
}
'''

    with open(CONFIG_JS, "w", encoding="utf-8") as f:
        f.write(config_js_content)

    # config_flow.js: getFlowConfig returns the flow object
    flow_config = config.get("flow", {})
    flow_str = json.dumps(flow_config, ensure_ascii=False)
    flow_str_escaped = js_string_escape(flow_str)

    config_flow_content = '''// ════════════════════════════════════════════════════════════════
//  config_flow.js — مولّد من config.json (شغّل: python generate_config_js.py)
// ════════════════════════════════════════════════════════════════

function getFlowConfig() {
  return JSON.parse(''' + "'" + flow_str_escaped + "'" + ''');
}
'''

    with open(CONFIG_FLOW_JS, "w", encoding="utf-8") as f:
        f.write(config_flow_content)

    print(f"[OK] Updated {CONFIG_JS} and {CONFIG_FLOW_JS} from {CONFIG_JSON}")


if __name__ == "__main__":
    main()
