import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "opentelemetry-trace-viewer",
  name: "OpenTelemetry Trace Viewer",
  description: "加载 OTLP 或扁平 span JSON，生成调用树、耗时排行和服务统计。",
  category: "运维工具",
  subCategory: "observability",
  tags: ["opentelemetry", "trace", "otel", "spans"],
  icon: "network",
  runtime: "simple",
  featured: false
};

export default manifest;
