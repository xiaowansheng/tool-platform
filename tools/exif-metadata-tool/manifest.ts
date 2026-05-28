import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "exif-metadata-tool",
  name: "EXIF Metadata Tool",
  description: "查看 JPEG EXIF 和 PNG 文本元数据，并生成移除元数据后的图片文件。",
  category: "image",
  subCategory: "metadata",
  tags: ["exif", "metadata", "jpeg", "png", "privacy"],
  icon: "image-off",
  runtime: "simple",
  featured: false,
  permissions: ["filesystem"]
};

export default manifest;
