import AiSandboxLabTool from "@tool-platform/ai-sandbox-lab/tool";
import AiSandboxLabManifest from "@tool-platform/ai-sandbox-lab/manifest";
import Base64StudioTool from "@tool-platform/base64-studio/tool";
import Base64StudioManifest from "@tool-platform/base64-studio/manifest";
import ColorConverterTool from "@tool-platform/color-converter/tool";
import ColorConverterManifest from "@tool-platform/color-converter/manifest";
import CronHelperTool from "@tool-platform/cron-helper/tool";
import CronHelperManifest from "@tool-platform/cron-helper/manifest";
import HashGeneratorTool from "@tool-platform/hash-generator/tool";
import HashGeneratorManifest from "@tool-platform/hash-generator/manifest";
import JsonFormatterTool from "@tool-platform/json-formatter/tool";
import JsonFormatterManifest from "@tool-platform/json-formatter/manifest";
import JwtDecoderTool from "@tool-platform/jwt-decoder/tool";
import JwtDecoderManifest from "@tool-platform/jwt-decoder/manifest";
import MarkdownPreviewTool from "@tool-platform/markdown-preview/tool";
import MarkdownPreviewManifest from "@tool-platform/markdown-preview/manifest";
import RegexTesterTool from "@tool-platform/regex-tester/tool";
import RegexTesterManifest from "@tool-platform/regex-tester/manifest";
import TextInspectorTool from "@tool-platform/text-inspector/tool";
import TextInspectorManifest from "@tool-platform/text-inspector/manifest";
import TimestampConverterTool from "@tool-platform/timestamp-converter/tool";
import TimestampConverterManifest from "@tool-platform/timestamp-converter/manifest";
import UrlCodecTool from "@tool-platform/url-codec/tool";
import UrlCodecManifest from "@tool-platform/url-codec/manifest";
import UuidGeneratorTool from "@tool-platform/uuid-generator/tool";
import UuidGeneratorManifest from "@tool-platform/uuid-generator/manifest";

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
    manifest: ColorConverterManifest,
    component: ColorConverterTool
  },
  {
    manifest: CronHelperManifest,
    component: CronHelperTool
  },
  {
    manifest: HashGeneratorManifest,
    component: HashGeneratorTool
  },
  {
    manifest: JsonFormatterManifest,
    component: JsonFormatterTool
  },
  {
    manifest: JwtDecoderManifest,
    component: JwtDecoderTool
  },
  {
    manifest: MarkdownPreviewManifest,
    component: MarkdownPreviewTool
  },
  {
    manifest: RegexTesterManifest,
    component: RegexTesterTool
  },
  {
    manifest: TextInspectorManifest,
    component: TextInspectorTool
  },
  {
    manifest: TimestampConverterManifest,
    component: TimestampConverterTool
  },
  {
    manifest: UrlCodecManifest,
    component: UrlCodecTool
  },
  {
    manifest: UuidGeneratorManifest,
    component: UuidGeneratorTool
  }
];
