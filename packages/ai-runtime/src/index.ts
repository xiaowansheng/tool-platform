export type AiCapability = "stream" | "embedding" | "chat" | "ocr" | "transcribe" | "vision";
export type AiMessageRole = "system" | "user" | "assistant";

export interface AiMessage {
  role: AiMessageRole;
  content: string;
}

export interface AiModelManifest {
  id: string;
  name: string;
  provider: string;
  capabilities: AiCapability[];
  contextWindow?: number;
  source?: "local" | "remote" | "webgpu" | "onnx" | "transformers";
}

export interface AiGenerationOptions {
  signal?: AbortSignal;
  maxTokens?: number;
  temperature?: number;
}

export interface AiChatResult {
  modelId: string;
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface AiStreamChunk {
  type: "status" | "token" | "done";
  value: string;
}

export interface LoadedAiModel {
  manifest: AiModelManifest;
  chat(messages: AiMessage[], options?: AiGenerationOptions): Promise<AiChatResult>;
  streamChat(messages: AiMessage[], options?: AiGenerationOptions): AsyncIterable<AiStreamChunk>;
  embed?(input: string, options?: AiGenerationOptions): Promise<number[]>;
  dispose?(): Promise<void> | void;
}

export interface AiModelProvider {
  listModels(): Promise<AiModelManifest[]> | AiModelManifest[];
  loadModel(modelId: string): Promise<LoadedAiModel> | LoadedAiModel;
}

function tokenize(input: string) {
  return input.trim().split(/\s+/).filter(Boolean);
}

function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new Error("AI request cancelled");
  }
}

export class AiRuntime {
  private loadedModels = new Map<string, Promise<LoadedAiModel>>();

  constructor(private provider: AiModelProvider) {}

  async listModels() {
    return this.provider.listModels();
  }

  async loadModel(modelId: string) {
    const cached = this.loadedModels.get(modelId);

    if (cached) {
      return cached;
    }

    const loaded = Promise.resolve(this.provider.loadModel(modelId));
    this.loadedModels.set(modelId, loaded);
    return loaded;
  }

  async unloadModel(modelId: string) {
    const model = await this.loadedModels.get(modelId);

    if (model?.dispose) {
      await model.dispose();
    }

    this.loadedModels.delete(modelId);
  }

  async chat(modelId: string, messages: AiMessage[], options: AiGenerationOptions = {}) {
    assertNotAborted(options.signal);
    const model = await this.loadModel(modelId);
    return model.chat(messages, options);
  }

  async *streamChat(modelId: string, messages: AiMessage[], options: AiGenerationOptions = {}) {
    assertNotAborted(options.signal);
    const model = await this.loadModel(modelId);

    for await (const chunk of model.streamChat(messages, options)) {
      assertNotAborted(options.signal);
      yield chunk;
    }
  }

  async embed(modelId: string, input: string, options: AiGenerationOptions = {}) {
    assertNotAborted(options.signal);
    const model = await this.loadModel(modelId);

    if (!model.embed) {
      throw new Error(`Model "${modelId}" does not support embeddings`);
    }

    return model.embed(input, options);
  }
}

export function createAiRuntime(provider: AiModelProvider) {
  return new AiRuntime(provider);
}

function createLocalAnswer(messages: AiMessage[], maxTokens = 160) {
  const userMessage = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
  const systemMessage = messages.find((message) => message.role === "system")?.content ?? "";
  const words = tokenize(userMessage);
  const uniqueTerms = Array.from(new Set(words.map((word) => word.toLowerCase().replace(/[^\p{L}\p{N}_-]/gu, ""))))
    .filter(Boolean)
    .slice(0, 8);
  const shortPrompt = userMessage.trim().replace(/\s+/g, " ").slice(0, 220);
  const sections = [
    systemMessage ? `System focus: ${systemMessage.trim().slice(0, 120)}` : "System focus: concise tool output.",
    `Prompt summary: ${shortPrompt || "No prompt provided."}`,
    `Detected terms: ${uniqueTerms.join(", ") || "none"}.`,
    `Suggested response: ${shortPrompt ? `Turn this into a clear, scoped workflow around ${uniqueTerms[0] ?? "the request"}.` : "Add a concrete prompt to produce a useful result."}`
  ];

  return tokenize(sections.join(" ")).slice(0, maxTokens).join(" ");
}

function createEmbedding(input: string) {
  const vector = new Array<number>(16).fill(0);

  for (const [index, character] of Array.from(input).entries()) {
    vector[index % vector.length] += character.codePointAt(0) ?? 0;
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => Number((value / magnitude).toFixed(6)));
}

export function createLocalTextModelProvider(): AiModelProvider {
  const manifest: AiModelManifest = {
    id: "local-text-sim",
    name: "Local Text Simulator",
    provider: "tool-platform",
    capabilities: ["chat", "stream", "embedding"],
    contextWindow: 4096,
    source: "local"
  };

  return {
    listModels() {
      return [manifest];
    },
    loadModel(modelId: string) {
      if (modelId !== manifest.id) {
        throw new Error(`Unknown local model "${modelId}"`);
      }

      return {
        manifest,
        async chat(messages, options = {}) {
          assertNotAborted(options.signal);
          const content = createLocalAnswer(messages, options.maxTokens);

          return {
            modelId: manifest.id,
            content,
            usage: {
              inputTokens: messages.reduce((sum, message) => sum + tokenize(message.content).length, 0),
              outputTokens: tokenize(content).length
            }
          };
        },
        async *streamChat(messages, options = {}) {
          yield {
            type: "status",
            value: "loading-model"
          };

          const content = createLocalAnswer(messages, options.maxTokens);
          const tokens = tokenize(content);

          for (const token of tokens) {
            assertNotAborted(options.signal);
            yield {
              type: "token",
              value: `${token} `
            };
          }

          yield {
            type: "done",
            value: content
          };
        },
        async embed(input, options = {}) {
          assertNotAborted(options.signal);
          return createEmbedding(input);
        }
      };
    }
  };
}
