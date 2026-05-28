import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "qr-barcode-tool",
  name: "QR Barcode Tool",
  description: "生成本地 QR Code 与 Code 128 条形码，并通过浏览器 BarcodeDetector 解析图片。",
  category: "image-tools",
  subCategory: "code",
  tags: ["qr", "barcode", "code128", "scanner"],
  icon: "qr-code",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard", "filesystem"]
};

export default manifest;
