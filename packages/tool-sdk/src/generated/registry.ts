import Base64StudioTool from "@tool-platform/base64-studio/tool";
import Base64StudioManifest from "@tool-platform/base64-studio/manifest";
import JsonFormatterTool from "@tool-platform/json-formatter/tool";
import JsonFormatterManifest from "@tool-platform/json-formatter/manifest";
import RegexTesterTool from "@tool-platform/regex-tester/tool";
import RegexTesterManifest from "@tool-platform/regex-tester/manifest";

import type { ToolRecord } from "../types";

export const toolRecords: ToolRecord[] = [
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
  }
];
