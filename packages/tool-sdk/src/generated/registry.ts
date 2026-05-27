import AiSandboxLabTool from "@tool-platform/ai-sandbox-lab/tool";
import AiSandboxLabManifest from "@tool-platform/ai-sandbox-lab/manifest";
import Base64StudioTool from "@tool-platform/base64-studio/tool";
import Base64StudioManifest from "@tool-platform/base64-studio/manifest";
import JsonFormatterTool from "@tool-platform/json-formatter/tool";
import JsonFormatterManifest from "@tool-platform/json-formatter/manifest";
import RegexTesterTool from "@tool-platform/regex-tester/tool";
import RegexTesterManifest from "@tool-platform/regex-tester/manifest";
import TextInspectorTool from "@tool-platform/text-inspector/tool";
import TextInspectorManifest from "@tool-platform/text-inspector/manifest";

import type { ToolRecord } from "../types";

export const toolRecords: ToolRecord[] = [
  {
    manifest: AiSandboxLabManifest,
    component: AiSandboxLabTool
  },
  {
    manifest: Base64StudioManifest,
    component: Base64StudioTool
  },
  {
    manifest: JsonFormatterManifest,
    component: JsonFormatterTool
  },
  {
    manifest: RegexTesterManifest,
    component: RegexTesterTool
  },
  {
    manifest: TextInspectorManifest,
    component: TextInspectorTool
  }
];
