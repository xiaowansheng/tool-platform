import assert from "node:assert/strict";
import test from "node:test";

import { createToolRuntimeManager } from "./index";

test("runtime manager runs the documented lifecycle order", async () => {
  const manager = createToolRuntimeManager();
  const calls: string[] = [];

  manager.registerTool("worker-tool", () => ({
    init() {
      calls.push("init");
    },
    mount() {
      calls.push("mount");
    },
    activate() {
      calls.push("activate");
    },
    suspend() {
      calls.push("suspend");
    },
    destroy() {
      calls.push("destroy");
    }
  }));

  const opened = await manager.openTool("worker-tool");
  assert.equal(opened.status, "active");

  const closed = await manager.closeTool("worker-tool");
  assert.equal(closed.status, "destroyed");
  assert.deepEqual(calls, ["init", "mount", "activate", "suspend", "destroy"]);
});

test("restartTool creates a fresh runtime instance", async () => {
  const manager = createToolRuntimeManager();
  let factoryCalls = 0;
  const instanceIds: number[] = [];

  manager.registerTool("wasm-tool", () => {
    const instanceId = ++factoryCalls;

    return {
      init() {
        instanceIds.push(instanceId);
      }
    };
  });

  await manager.openTool("wasm-tool");
  await manager.restartTool("wasm-tool");

  assert.deepEqual(instanceIds, [1, 2]);
  assert.equal(manager.getSnapshot("wasm-tool").status, "active");
});
