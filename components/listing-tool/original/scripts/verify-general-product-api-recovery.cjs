/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS verification harness. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function apiWith(fetchMock, settings = {}) {
  const cjsModule = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, "../lib/general-products-api.ts"), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const delays = [];
  const timers = new Set();
  vm.runInNewContext(source, {
    module: cjsModule, exports: cjsModule.exports, URL, Headers, AbortController,
    process: { env: { NEXT_PUBLIC_API_URL: settings.base || "/api/tools/listing-tool/" } },
    fetch: fetchMock,
    setTimeout(callback, delay) {
      const token = {};
      timers.add(token);
      if (delay === 8000) {
        if (settings.timeout) setTimeout(() => { if (timers.delete(token)) callback(); }, 0);
      } else {
        delays.push(delay);
        settings.onWait?.();
        setTimeout(() => { if (timers.delete(token)) callback(); }, 0);
      }
      return token;
    },
    clearTimeout(token) { timers.delete(token); },
  });
  return { ...cjsModule.exports, delays, timers };
}

const response = (status, data) => ({ ok: status >= 200 && status < 300, status, json: async () => data });

(async () => {
  let calls = 0;
  const restarting = apiWith(async (url, options) => {
    calls += 1;
    assert.equal(url, "/api/tools/listing-tool/general-products/test");
    assert.equal(options.cache, "no-store");
    assert.equal(options.headers.get("Content-Type"), "application/json");
    assert.equal(options.headers.get("X-Test"), "kept");
    if (calls < 3) throw new TypeError("fetch failed during restart");
    return response(200, { success: true, product: { id: "saved" } });
  });
  const recovered = await restarting.generalProductsRequest("/test", { headers: new Headers({ "X-Test": "kept" }) });
  assert.equal(recovered.product.id, "saved");
  assert.equal(calls, 3);
  assert.deepEqual(restarting.delays, [750, 1500]);
  assert.equal(restarting.timers.size, 0, "Request and backoff timers are cleaned up");

  calls = 0;
  const unavailable = apiWith(async () => { calls += 1; throw new TypeError("offline"); });
  await assert.rejects(unavailable.generalProductsRequest("/"), (error) => {
    assert.equal(error.name, "GeneralProductConnectionError");
    assert.match(error.message, /\/api\/tools\/listing-tool/);
    assert.match(error.message, /unsaved batch has not been cleared/);
    return true;
  });
  assert.equal(calls, 4, "Read retries are bounded");
  assert.deepEqual(unavailable.delays, [750, 1500, 3000]);
  assert.equal(unavailable.timers.size, 0);

  calls = 0;
  const databaseStarting = apiWith(async () => { calls += 1; return calls < 3 ? response(503, { message: "MongoDB unavailable" }) : response(200, { products: [] }); });
  await databaseStarting.generalProductsRequest("/");
  assert.equal(calls, 3, "Transient 503 reads recover");

  for (const method of ["POST", "PATCH", "DELETE"]) {
    calls = 0;
    const writes = apiWith(async () => { calls += 1; throw new TypeError("offline"); });
    await assert.rejects(writes.generalProductsRequest("/test", { method }), /Unable to reach/);
    assert.equal(calls, 1, `${method} must never be replayed automatically`);
    assert.deepEqual(writes.delays, []);
    assert.equal(writes.timers.size, 0, "Writes keep their existing no-timeout behavior");
  }
  calls = 0;
  const serverError = apiWith(async () => { calls += 1; return response(404, { message: "Product not found." }); });
  await assert.rejects(serverError.generalProductsRequest("/missing"), /Product not found/);
  assert.equal(calls, 1, "Application errors do not trigger retries");

  calls = 0;
  const offlineWrite = apiWith(async () => { calls += 1; return response(503, { message: "MongoDB unavailable" }); });
  await assert.rejects(offlineWrite.generalProductsRequest("/batch", { method: "POST" }), /MongoDB unavailable/);
  assert.equal(calls, 1);

  const alreadyCancelled = new AbortController();
  alreadyCancelled.abort(new Error("cancelled by caller"));
  calls = 0;
  const cancelledApi = apiWith(async () => { calls += 1; return response(200, {}); });
  await assert.rejects(cancelledApi.generalProductsRequest("/", { signal: alreadyCancelled.signal }), /cancelled by caller/);
  assert.equal(calls, 0);

  const cancelling = new AbortController();
  calls = 0;
  const cancelDuringWait = apiWith(async () => { calls += 1; throw new TypeError("offline"); });
  const pending = cancelDuringWait.generalProductsRequest("/", { signal: cancelling.signal });
  queueMicrotask(() => cancelling.abort(new Error("leave page")));
  await assert.rejects(pending, /leave page/);
  assert.equal(calls, 1);
  assert.equal(cancelDuringWait.timers.size, 0);

  calls = 0;
  const timedOutRead = apiWith(async (_url, options) => {
    calls += 1;
    return new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => reject(new Error("timed out")), { once: true }));
  }, { timeout: true });
  await assert.rejects(timedOutRead.generalProductsRequest("/"), /Unable to reach/);
  assert.equal(calls, 4, "Stalled reads time out and remain bounded");
  assert.equal(timedOutRead.timers.size, 0);

  const redact = apiWith(async () => { throw new TypeError("offline"); }, { base: "https://name:password@example.com/api?secret=hidden" });
  await assert.rejects(redact.generalProductsRequest("/", { method: "POST" }), (error) => {
    assert.match(error.message, /\/api\/tools\/listing-tool/);
    assert.ok(!/password|secret|hidden/.test(error.message));
    return true;
  });

  console.log("General-product API recovery verified: bounded read retries, 503 recovery, timeout/abort cleanup, safe headers, redacted errors, and no automatic save/delete retries.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
