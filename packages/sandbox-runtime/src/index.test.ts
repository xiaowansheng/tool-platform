import assert from "node:assert/strict";
import test from "node:test";

import { createSandboxDocument, DEFAULT_IFRAME_SANDBOX, SANDBOX_CHANNEL } from "./index";

test("sandbox document embeds the postMessage protocol and escapes title text", () => {
  const document = createSandboxDocument({
    title: "</script><h1>Injected</h1>",
    accentColor: "#00ffcc"
  });

  assert.equal(DEFAULT_IFRAME_SANDBOX, "allow-scripts");
  assert.ok(document.includes(SANDBOX_CHANNEL));
  assert.ok(document.includes("&lt;/script&gt;&lt;h1&gt;Injected&lt;/h1&gt;"));
  assert.ok(!document.includes("</script><h1>Injected</h1>"));
});
