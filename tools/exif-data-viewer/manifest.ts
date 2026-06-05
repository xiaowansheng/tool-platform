import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "exif-data-viewer",
  name: "EXIF Data Viewer",
  description: "查看图片 EXIF 元数据：相机型号、GPS、拍摄参数等。",
  category: "image-tools",
  tags: ["exif", "metadata", "image", "camera"],
  icon: "info",
  runtime: "simple",
  featured: false
};

export default manifest;
