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
  | "developer"
  | "ai"
  | "text"
  | "image"
  | "video"
  | "file"
  | "network"
  | "ops"
  | "design"
  | "productivity";

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
}
