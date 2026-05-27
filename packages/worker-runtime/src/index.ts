import type { ToolRuntimeController } from "@tool-platform/runtime";

export interface WorkerCallMessage<TPayload = unknown> {
  id: string;
  kind: "call";
  action: string;
  payload: TPayload;
}

export interface WorkerStreamMessage<TPayload = unknown> {
  id: string;
  kind: "stream";
  action: string;
  payload: TPayload;
}

export interface WorkerCancelMessage {
  id: string;
  kind: "cancel";
}

export type WorkerRequestMessage<TPayload = unknown> =
  | WorkerCallMessage<TPayload>
  | WorkerStreamMessage<TPayload>
  | WorkerCancelMessage;

export interface WorkerResponseMessage<TResult = unknown> {
  id: string;
  kind: "response";
  success: boolean;
  data?: TResult;
  error?: string;
}

export interface WorkerStreamChunkMessage<TChunk = unknown> {
  id: string;
  kind: "stream";
  chunk: TChunk;
}

export type WorkerEventMessage<TResult = unknown, TChunk = unknown> =
  | WorkerResponseMessage<TResult>
  | WorkerStreamChunkMessage<TChunk>;

export interface WorkerLike {
  postMessage(message: WorkerRequestMessage): void;
  addEventListener(type: "message", listener: (event: MessageEvent<WorkerEventMessage>) => void): void;
  removeEventListener(type: "message", listener: (event: MessageEvent<WorkerEventMessage>) => void): void;
  terminate?: () => void;
}

export interface InlineWorkerHandle {
  worker: Worker;
  terminate(): void;
}

interface PendingRequest {
  reject(error: Error): void;
  resolve(value: unknown): void;
  onChunk?(value: unknown): void;
}

function createRequestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `worker-${Math.random().toString(36).slice(2)}`;
}

export class WorkerClient {
  private pending = new Map<string, PendingRequest>();
  private readonly onMessage = (event: MessageEvent<WorkerEventMessage>) => {
    const message = event.data;
    const request = this.pending.get(message.id);

    if (!request) {
      return;
    }

    if (message.kind === "stream") {
      request.onChunk?.(message.chunk);
      return;
    }

    this.pending.delete(message.id);

    if (message.success) {
      request.resolve(message.data);
      return;
    }

    request.reject(new Error(message.error ?? "Worker action failed"));
  };

  constructor(private worker: WorkerLike) {
    this.worker.addEventListener("message", this.onMessage);
  }

  call<TResult = unknown, TPayload = unknown>(
    action: string,
    payload: TPayload,
    options: { signal?: AbortSignal } = {}
  ) {
    const id = createRequestId();

    return new Promise<TResult>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value) => resolve(value as TResult),
        reject
      });

      const abort = () => {
        this.cancel(id);
      };

      if (options.signal) {
        if (options.signal.aborted) {
          abort();
          reject(new Error("Worker request cancelled"));
          return;
        }

        options.signal.addEventListener("abort", abort, { once: true });
      }

      this.worker.postMessage({
        id,
        kind: "call",
        action,
        payload
      });
    });
  }

  stream<TChunk = unknown, TResult = unknown, TPayload = unknown>(
    action: string,
    payload: TPayload,
    onChunk: (value: TChunk) => void
  ) {
    const id = createRequestId();

    const result = new Promise<TResult>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value) => resolve(value as TResult),
        reject,
        onChunk: (value) => onChunk(value as TChunk)
      });

      this.worker.postMessage({
        id,
        kind: "stream",
        action,
        payload
      });
    });

    return {
      id,
      result,
      cancel: () => this.cancel(id)
    };
  }

  cancel(id: string) {
    this.worker.postMessage({
      id,
      kind: "cancel"
    });

    const request = this.pending.get(id);

    if (request) {
      this.pending.delete(id);
      request.reject(new Error("Worker request cancelled"));
    }
  }

  dispose() {
    this.worker.removeEventListener("message", this.onMessage);

    for (const [id, request] of this.pending) {
      this.pending.delete(id);
      request.reject(new Error(`Worker client disposed before "${id}" completed`));
    }
  }
}

export class WorkerToolRuntime implements ToolRuntimeController {
  private handle?: InlineWorkerHandle;
  private client?: WorkerClient;

  constructor(private readonly createHandle: () => InlineWorkerHandle) {}

  init() {
    this.handle = this.createHandle();
    this.client = new WorkerClient(this.handle.worker);
  }

  destroy() {
    this.client?.dispose();
    this.handle?.terminate();
    this.client = undefined;
    this.handle = undefined;
  }

  getClient() {
    if (!this.client) {
      throw new Error("Worker runtime is not active");
    }

    return this.client;
  }
}

export function createWorkerClient(worker: WorkerLike) {
  return new WorkerClient(worker);
}

export function createInlineWorker(scope: () => void): InlineWorkerHandle {
  const blob = new Blob([`(${scope.toString()})();`], {
    type: "text/javascript"
  });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url, { type: "module" });
  let revoked = false;

  return {
    worker,
    terminate() {
      worker.terminate();

      if (!revoked) {
        URL.revokeObjectURL(url);
        revoked = true;
      }
    }
  };
}
