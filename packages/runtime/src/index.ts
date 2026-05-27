export type RuntimeStatus =
  | "unregistered"
  | "registered"
  | "initializing"
  | "mounted"
  | "active"
  | "suspended"
  | "destroyed"
  | "error";

export interface ToolRuntimeController {
  init?(): Promise<void> | void;
  mount?(): Promise<void> | void;
  activate?(): Promise<void> | void;
  suspend?(): Promise<void> | void;
  resume?(): Promise<void> | void;
  destroy?(): Promise<void> | void;
}

export interface ToolRuntimeSnapshot {
  toolId: string;
  status: RuntimeStatus;
  error?: string;
  updatedAt: number;
}

export type ToolRuntimeFactory = () => ToolRuntimeController;
export type RuntimeListener = (snapshot: ToolRuntimeSnapshot) => void;

interface RuntimeEntry {
  factory: ToolRuntimeFactory;
  controller?: ToolRuntimeController;
  snapshot: ToolRuntimeSnapshot;
}

function createSnapshot(toolId: string, status: RuntimeStatus, error?: string): ToolRuntimeSnapshot {
  return {
    toolId,
    status,
    error,
    updatedAt: Date.now()
  };
}

export class ToolRuntimeManager {
  private entries = new Map<string, RuntimeEntry>();
  private listeners = new Set<RuntimeListener>();

  registerTool(toolId: string, factory: ToolRuntimeFactory) {
    const entry = this.entries.get(toolId);
    const snapshot = createSnapshot(toolId, "registered");

    this.entries.set(toolId, {
      factory,
      controller: entry?.controller,
      snapshot
    });

    this.emit(snapshot);
    return snapshot;
  }

  async unregisterTool(toolId: string) {
    const entry = this.entries.get(toolId);

    if (!entry) {
      return createSnapshot(toolId, "unregistered");
    }

    await this.closeTool(toolId);
    this.entries.delete(toolId);

    const snapshot = createSnapshot(toolId, "unregistered");
    this.emit(snapshot);
    return snapshot;
  }

  getSnapshot(toolId: string) {
    return this.entries.get(toolId)?.snapshot ?? createSnapshot(toolId, "unregistered");
  }

  getSnapshots() {
    return Array.from(this.entries.values(), (entry) => entry.snapshot);
  }

  subscribe(listener: RuntimeListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async openTool(toolId: string): Promise<ToolRuntimeSnapshot> {
    const entry = this.entries.get(toolId);

    if (!entry) {
      throw new Error(`No runtime registered for tool "${toolId}"`);
    }

    if (entry.controller && entry.snapshot.status === "suspended") {
      if (entry.controller.resume) {
        return this.resumeTool(toolId);
      }

      this.updateSnapshot(entry, "active");
      return entry.snapshot;
    }

    if (entry.controller && entry.snapshot.status === "active") {
      return entry.snapshot;
    }

    const controller = entry.factory();
    entry.controller = controller;

    await this.runLifecycle(entry, "initializing", controller.init);
    await this.runLifecycle(entry, "mounted", controller.mount);

    if (controller.activate) {
      await this.runLifecycle(entry, "active", controller.activate);
    } else {
      this.updateSnapshot(entry, "active");
    }

    return entry.snapshot;
  }

  async suspendTool(toolId: string): Promise<ToolRuntimeSnapshot> {
    const entry = this.entries.get(toolId);

    if (!entry?.controller) {
      return this.getSnapshot(toolId);
    }

    if (entry.controller.suspend) {
      await this.runLifecycle(entry, "suspended", entry.controller.suspend);
    } else {
      this.updateSnapshot(entry, "suspended");
    }

    return entry.snapshot;
  }

  async resumeTool(toolId: string): Promise<ToolRuntimeSnapshot> {
    const entry = this.entries.get(toolId);

    if (!entry?.controller) {
      return this.openTool(toolId);
    }

    if (entry.controller.resume) {
      await this.runLifecycle(entry, "active", entry.controller.resume);
    } else {
      this.updateSnapshot(entry, "active");
    }

    return entry.snapshot;
  }

  async closeTool(toolId: string): Promise<ToolRuntimeSnapshot> {
    const entry = this.entries.get(toolId);

    if (!entry?.controller) {
      return this.getSnapshot(toolId);
    }

    if (entry.snapshot.status === "active" && entry.controller.suspend) {
      await this.runLifecycle(entry, "suspended", entry.controller.suspend);
    }

    if (entry.controller.destroy) {
      await this.runLifecycle(entry, "destroyed", entry.controller.destroy);
    } else {
      this.updateSnapshot(entry, "destroyed");
    }

    entry.controller = undefined;
    return entry.snapshot;
  }

  async restartTool(toolId: string): Promise<ToolRuntimeSnapshot> {
    await this.closeTool(toolId);
    return this.openTool(toolId);
  }

  private async runLifecycle(
    entry: RuntimeEntry,
    status: RuntimeStatus,
    lifecycle?: (() => Promise<void> | void) | undefined
  ) {
    try {
      if (lifecycle) {
        await lifecycle.call(entry.controller);
      }

      this.updateSnapshot(entry, status);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Runtime lifecycle failed";
      this.updateSnapshot(entry, "error", message);
      throw error;
    }
  }

  private updateSnapshot(entry: RuntimeEntry, status: RuntimeStatus, error?: string) {
    entry.snapshot = createSnapshot(entry.snapshot.toolId, status, error);
    this.emit(entry.snapshot);
  }

  private emit(snapshot: ToolRuntimeSnapshot) {
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}

export function createToolRuntimeManager() {
  return new ToolRuntimeManager();
}
