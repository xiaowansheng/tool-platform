import assert from "node:assert/strict";
import test from "node:test";

import { createAiRuntime, createLocalTextModelProvider } from "./index";

test("local AI runtime streams status, tokens, and final content", async () => {
  const runtime = createAiRuntime(createLocalTextModelProvider());
  const chunks = [];

  for await (const chunk of runtime.streamChat("local-text-sim", [
    {
      role: "user",
      content: "Summarize a worker based tool platform"
    }
  ])) {
    chunks.push(chunk);
  }

  assert.equal(chunks[0]?.type, "status");
  assert.ok(chunks.some((chunk) => chunk.type === "token"));
  assert.equal(chunks.at(-1)?.type, "done");
});

test("local AI runtime returns stable embedding dimensions", async () => {
  const runtime = createAiRuntime(createLocalTextModelProvider());
  const embedding = await runtime.embed("local-text-sim", "tool platform");

  assert.equal(embedding.length, 16);
  assert.ok(embedding.every((value) => Number.isFinite(value)));
});
