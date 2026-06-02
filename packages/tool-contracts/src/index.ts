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
  | "ai-tools"
  | "developer-tools"
  | "ops-tools"
  | "security-tools"
  | "file-tools"
  | "image-tools"
  | "media-tools"
  | "text-tools"
  | "data-tools"
  | "office-tools"
  | "design-tools"
  | "seo-tools"
  | "webmaster-tools"
  | "learning-tools"
  | "calculator-tools"
  | "social-tools"
  | "ecommerce-tools"
  | "productivity-tools"
  | "entertainment-tools"
  | "discovery-tools";

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

export interface ToolAppProps {
  manifest: ToolManifest;
  locale: string;
  path: string;
  segments: string[];
}


export interface ToolRecord {
  manifest: ToolManifest;
  component: ComponentType<ToolAppProps>;
}

export interface CategoryMeta {
  id: ToolCategory;
  label: string;
  description: string;
  icon?: string;
  keywords?: string[];
}
