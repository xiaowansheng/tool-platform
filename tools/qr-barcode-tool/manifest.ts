import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "qr-barcode-tool",
  name: "QR Barcode Tool",
  description: "生成本地 QR 二维码与一维条形码（Code 128 / Code 39 / EAN-13），并整合多引擎解析扫描图片中的条码。",
  category: "image-tools",
  subCategory: "code",
  tags: ["qr", "barcode", "code128", "code39", "ean13", "scanner"],
  icon: "qr-code",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard", "filesystem"]
};

export default manifest;
