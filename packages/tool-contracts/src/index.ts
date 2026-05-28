import type { ComponentType } from "react";

export type ToolRuntime =
  | "simple"
  | "worker"
  | "wasm"
  | "ai"
  | "sandbox"
  | "realtime";

export type ToolPermission =
  | "clipboard"
  | "filesystem"
  | "camera"
  | "microphone"
  | "webgpu"
  | "notification";

export type ToolCategory =
  | "AI工具"
  | "开发工具"
  | "运维工具"
  | "网络安全"
  | "文件工具"
  | "图片工具"
  | "视频音频"
  | "文本工具"
  | "数据工具"
  | "办公工具"
  | "设计工具"
  | "SEO工具"
  | "站长工具"
  | "学习工具"
  | "计算工具"
  | "社媒工具"
  | "电商工具"
  | "效率工具"
  | "娱乐工具"
  | "导航发现";

export interface ToolManifest {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  subCategory?: string;
  tags: string[];
  icon: string;
  runtime: ToolRuntime;
  featured?: boolean;
  version?: string;
  isolation?: "inline" | "worker" | "iframe";
  sandbox?: boolean;
  permissions?: ToolPermission[];
  capabilities?: string[];
  preload?: string[];
  memoryLimit?: number;
  worker?: boolean;
  ai?: boolean;
}

export interface ToolClientProps {
  manifest: ToolManifest;
}

export interface ToolRecord {
  manifest: ToolManifest;
  component: ComponentType<ToolClientProps>;
}

export interface CategoryMeta {
  id: ToolCategory;
  label: string;
  description: string;
  icon?: string;
  keywords?: string[];
}
