import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "image-ocr-preprocessor",
  name: "Image OCR Preprocessor",
  description: "在本地用 canvas 对图片做灰度、阈值、对比度、反色和缩放预处理，导出更适合 OCR 的 PNG。",
  category: "图片工具",
  subCategory: "preprocess",
  tags: ["ocr", "image", "canvas", "threshold", "preprocess"],
  icon: "scan-text",
  runtime: "simple",
  featured: false,
  permissions: ["filesystem"],
  capabilities: ["canvas-processing", "ocr-preprocess", "png-export"]
};

export default manifest;
