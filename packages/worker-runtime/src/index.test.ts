import assert from "node:assert/strict";
import test from "node:test";

import { createWorkerClient, type WorkerEventMessage, type WorkerLike, type WorkerRequestMessage } from "./index";

class MockWorker implements WorkerLike {
  private listeners = new Set<(event: MessageEvent<WorkerEventMessage>) => void>();
  posted: WorkerRequestMessage[] = [];

  postMessage(message: WorkerRequestMessage) {
    this.posted.push(message);
  }

  addEventListener(type: "message", listener: (event: MessageEvent<WorkerEventMessage>) => void) {
    if (type === "message") {
      this.listeners.add(listener);
    }
  }

  removeEventListener(type: "message", listener: (event: MessageEvent<WorkerEventMessage>) => void) {
    if (type === "message") {
      this.listeners.delete(listener);
    }
  }

  emit(message: WorkerEventMessage) {
    for (const listener of this.listeners) {
      listener({ data: message } as MessageEvent<WorkerEventMessage>);
    }
  }
}

test("worker client resolves call responses", async () => {
  const worker = new MockWorker();
  const client = createWorkerClient(worker);
  const resultPromise = client.call<{ ok: boolean }>("ping", { value: 1 });
  const request = worker.posted[0];

  assert.equal(request?.kind, "call");
  worker.emit({
    id: request.id,
    kind: "response",
    success: true,
    data: { ok: true }
  });

  const result = await resultPromise;
  assert.deepEqual(result, { ok: true });
});

test("worker client streams progress chunks before final resolution", async () => {
  const worker = new MockWorker();
  const client = createWorkerClient(worker);
  const chunks: number[] = [];
  const stream = client.stream<number, string>("analyze", { payload: "text" }, (chunk) => {
    chunks.push(chunk);
  });
  const request = worker.posted[0];

  assert.equal(request?.kind, "stream");
  worker.emit({
    id: request.id,
    kind: "stream",
    chunk: 25
  });
  worker.emit({
    id: request.id,
    kind: "stream",
    chunk: 100
  });
  worker.emit({
    id: request.id,
    kind: "response",
    success: true,
    data: "done"
  });

  const result = await stream.result;
  assert.deepEqual(chunks, [25, 100]);
  assert.equal(result, "done");
});
