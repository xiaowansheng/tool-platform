import type { CategoryMeta, ToolCategory } from "@tool-platform/tool-contracts";

export const categories: CategoryMeta[] = [
  {
    id: "developer",
    label: "开发工具",
    description: "面向工程流的格式化、调试与协议工具。"
  },
  {
    id: "ai",
    label: "AI 工具",
    description: "面向推理、模型协作和智能工作流。"
  },
  {
    id: "text",
    label: "文本工具",
    description: "处理编码、转换、提取与文本生成。"
  },
  {
    id: "image",
    label: "图片工具",
    description: "图像压缩、转换、分析与视觉处理。"
  },
  {
    id: "video",
    label: "视频工具",
    description: "流媒体、剪辑、转码与视频理解。"
  },
  {
    id: "file",
    label: "文件工具",
    description: "导入、导出、解析与大型文件工作流。"
  },
  {
    id: "network",
    label: "网络工具",
    description: "请求调试、接口观测与网络协议辅助。"
  },
  {
    id: "ops",
    label: "运维工具",
    description: "监控、脚本、配置校验与交付辅助。"
  },
  {
    id: "design",
    label: "设计工具",
    description: "面向视觉设计、排版与资产整理。"
  },
  {
    id: "productivity",
    label: "效率工具",
    description: "收藏、历史、批处理与个人工作台。"
  }
];

export function getCategoryMeta(category: ToolCategory) {
  return categories.find((item) => item.id === category) ?? null;
}
