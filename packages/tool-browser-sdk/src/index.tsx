"use client";

import { useEffect, useState } from "react";

import { createAiRuntime as createAiRuntimeCore, createLocalTextModelProvider } from "@tool-platform/ai-runtime";
import { createToolRuntimeManager, type ToolRuntimeFactory, type ToolRuntimeSnapshot } from "@tool-platform/runtime";
import {
  DEFAULT_IFRAME_SANDBOX,
  IframeSandboxClient,
  createIframeSandboxClient,
  createSandboxDocument
} from "@tool-platform/sandbox-runtime";
import {
  deleteOpfsFile,
  isOpfsSupported,
  listOpfsEntries,
  readOpfsText,
  writeOpfsJson,
  writeOpfsText
} from "@tool-platform/storage";
import { clearWasmCache, loadWasm, preloadWasm } from "@tool-platform/wasm-runtime";
import {
  createInlineWorker,
  createWorkerClient,
  WorkerClient,
  WorkerToolRuntime,
  type InlineWorkerHandle
} from "@tool-platform/worker-runtime";

export interface ToolToast {
  id: string;
  title: string;
  description?: string;
  tone?: "info" | "success" | "error";
}

const toolRuntimeManager = createToolRuntimeManager();
const toastState: ToolToast[] = [];
const toastListeners = new Set<(toasts: ToolToast[]) => void>();

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2)}`;
}

function emitToastUpdate() {
  const snapshot = [...toastState];

  for (const listener of toastListeners) {
    listener(snapshot);
  }
}

export function subscribeToToolToasts(listener: (toasts: ToolToast[]) => void) {
  toastListeners.add(listener);
  listener([...toastState]);

  return () => {
    toastListeners.delete(listener);
  };
}

export function pushToolToast(input: Omit<ToolToast, "id"> & { id?: string }) {
  const toast = {
    ...input,
    id: input.id ?? createId("toast")
  };

  toastState.unshift(toast);
  emitToastUpdate();
  return toast.id;
}

export function dismissToolToast(id: string) {
  const next = toastState.filter((toast) => toast.id !== id);

  toastState.splice(0, toastState.length, ...next);
  emitToastUpdate();
}

export function useToolToasts() {
  const [toasts, setToasts] = useState<ToolToast[]>([...toastState]);

  useEffect(() => subscribeToToolToasts(setToasts), []);
  return toasts;
}

export function useToolRuntime(toolId: string) {
  const [snapshot, setSnapshot] = useState<ToolRuntimeSnapshot>(() => toolRuntimeManager.getSnapshot(toolId));

  useEffect(() => {
    setSnapshot(toolRuntimeManager.getSnapshot(toolId));

    return toolRuntimeManager.subscribe((nextSnapshot) => {
      if (nextSnapshot.toolId === toolId) {
        setSnapshot(nextSnapshot);
      }
    });
  }, [toolId]);

  return snapshot;
}

async function copy(text: string) {
  await navigator.clipboard.writeText(text);
}

function download(filename: string, contents: Blob | string, type = "text/plain;charset=utf-8") {
  const blob = contents instanceof Blob ? contents : new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function share(data: ShareData) {
  if (!navigator.share) {
    throw new Error("Web Share API is not supported in this browser");
  }

  await navigator.share(data);
}

async function openTextFile(accept = ".txt,.md,.json,.csv") {
  return new Promise<{ name: string; text: string }>((resolve, reject) => {
    const input = document.createElement("input");

    input.type = "file";
    input.accept = accept;
    input.onchange = async () => {
      const file = input.files?.[0];

      if (!file) {
        reject(new Error("No file selected"));
        return;
      }

      resolve({
        name: file.name,
        text: await file.text()
      });
    };
    input.click();
  });
}

export function createToolSdk() {
  return {
    copy,
    download,
    share,
    openTextFile,
    saveTextFile: download,
    cacheText: writeOpfsText,
    cacheJson: writeOpfsJson,
    readCachedText: readOpfsText,
    listCachedEntries: listOpfsEntries,
    deleteCachedFile: deleteOpfsFile,
    isOpfsSupported,
    registerRuntime(toolId: string, factory: ToolRuntimeFactory) {
      return toolRuntimeManager.registerTool(toolId, factory);
    },
    unregisterRuntime(toolId: string) {
      return toolRuntimeManager.unregisterTool(toolId);
    },
    openTool(toolId: string) {
      return toolRuntimeManager.openTool(toolId);
    },
    closeTool(toolId: string) {
      return toolRuntimeManager.closeTool(toolId);
    },
    restartTool(toolId: string) {
      return toolRuntimeManager.restartTool(toolId);
    },
    suspendTool(toolId: string) {
      return toolRuntimeManager.suspendTool(toolId);
    },
    getRuntimeSnapshot(toolId: string) {
      return toolRuntimeManager.getSnapshot(toolId);
    },
    subscribeRuntime(listener: (snapshot: ToolRuntimeSnapshot) => void) {
      return toolRuntimeManager.subscribe(listener);
    },
    toast(input: Omit<ToolToast, "id"> & { id?: string }) {
      return pushToolToast(input);
    },
    dismissToast(id: string) {
      dismissToolToast(id);
    },
    createWorkerClient,
    createInlineWorker,
    createWorkerRuntime(handleFactory: () => InlineWorkerHandle) {
      return new WorkerToolRuntime(handleFactory);
    },
    createAiRuntime(provider = createLocalTextModelProvider()) {
      return createAiRuntimeCore(provider);
    },
    createSandboxDocument,
    createIframeSandboxClient,
    loadWasm,
    preloadWasm,
    clearWasmCache
  };
}

export { WorkerClient, WorkerToolRuntime, createInlineWorker, createWorkerClient };
export { DEFAULT_IFRAME_SANDBOX, IframeSandboxClient, createIframeSandboxClient, createSandboxDocument };
