export interface WasmLoadOptions {
  key?: string;
  imports?: WebAssembly.Imports;
  source: Response | Promise<Response> | ArrayBuffer | Uint8Array;
}

const moduleCache = new Map<string, Promise<WebAssembly.Module>>();

function toBufferSource(source: ArrayBuffer | Uint8Array) {
  if (source instanceof Uint8Array) {
    return source.byteOffset === 0 && source.byteLength === source.buffer.byteLength
      ? (source.buffer as ArrayBuffer)
      : (source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength) as ArrayBuffer);
  }

  return source;
}

async function compileWasm(source: WasmLoadOptions["source"]) {
  if (source instanceof ArrayBuffer || source instanceof Uint8Array) {
    return WebAssembly.compile(toBufferSource(source));
  }

  const response = await source;

  if (typeof WebAssembly.instantiateStreaming === "function") {
    try {
      return WebAssembly.compileStreaming(response.clone());
    } catch {
      return WebAssembly.compile(await response.arrayBuffer());
    }
  }

  return WebAssembly.compile(await response.arrayBuffer());
}

export async function preloadWasm(options: WasmLoadOptions) {
  const cacheKey = options.key ?? "";

  if (cacheKey) {
    const cached = moduleCache.get(cacheKey);

    if (cached) {
      return cached;
    }
  }

  const modulePromise = compileWasm(options.source);

  if (cacheKey) {
    moduleCache.set(cacheKey, modulePromise);
  }

  return modulePromise;
}

export async function loadWasm(options: WasmLoadOptions) {
  const module = await preloadWasm(options);
  const instance = await WebAssembly.instantiate(module, options.imports);

  return {
    module,
    instance
  };
}

export function clearWasmCache(key?: string) {
  if (key) {
    moduleCache.delete(key);
    return;
  }

  moduleCache.clear();
}
