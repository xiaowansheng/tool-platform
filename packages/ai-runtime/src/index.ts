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

export interface OpenAiConfig {
  apiKey: string;
  baseUrl: string;
  modelId: string;
  temperature?: number;
}

export function createOpenAiCompatibleProvider(config: OpenAiConfig): AiModelProvider {
  const modelManifest: AiModelManifest = {
    id: config.modelId,
    name: `${config.modelId} (OpenAI-compatible)`,
    provider: "openai-compatible",
    capabilities: ["chat", "stream"],
    source: "remote"
  };

  return {
    listModels() {
      return [modelManifest];
    },
    loadModel(modelId) {
      if (modelId !== config.modelId) {
        throw new Error(`Unknown model "${modelId}", expected "${config.modelId}"`);
      }

      return {
        manifest: modelManifest,
        async chat(messages, options = {}) {
          const res = await fetch(`${config.baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
              model: config.modelId,
              messages: messages.map(m => ({ role: m.role, content: m.content })),
              temperature: config.temperature ?? options.temperature ?? 0.7,
              max_tokens: options.maxTokens,
              stream: false
            }),
            signal: options.signal
          });
          if (!res.ok) {
            const errText = await res.text();
            throw new Error(`API error (${res.status}): ${errText}`);
          }
          const json = await res.json();
          const content = json.choices?.[0]?.message?.content || "";
          return {
            modelId: config.modelId,
            content,
            usage: {
              inputTokens: json.usage?.prompt_tokens ?? 0,
              outputTokens: json.usage?.completion_tokens ?? 0
            }
          };
        },
        async *streamChat(messages, options = {}) {
          yield { type: "status", value: "connecting" };
          const res = await fetch(`${config.baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
              model: config.modelId,
              messages: messages.map(m => ({ role: m.role, content: m.content })),
              temperature: config.temperature ?? options.temperature ?? 0.7,
              max_tokens: options.maxTokens,
              stream: true
            }),
            signal: options.signal
          });
          if (!res.ok) {
            const errText = await res.text();
            throw new Error(`API stream error (${res.status}): ${errText}`);
          }
          if (!res.body) {
            throw new Error("Response body is empty");
          }
          
          yield { type: "status", value: "streaming" };
          
          const reader = res.body.getReader();
          const decoder = new TextDecoder("utf-8");
          let buffer = "";
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";
              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                if (trimmed === "data: [DONE]") continue;
                if (trimmed.startsWith("data: ")) {
                  try {
                    const json = JSON.parse(trimmed.slice(6));
                    const delta = json.choices?.[0]?.delta?.content;
                    if (delta) {
                      yield { type: "token", value: delta };
                    }
                  } catch (e) {
                    // Ignore parsing error for partial chunks
                  }
                }
              }
            }
            if (buffer.trim().startsWith("data: ") && buffer.trim() !== "data: [DONE]") {
              try {
                const json = JSON.parse(buffer.trim().slice(6));
                const delta = json.choices?.[0]?.delta?.content;
                if (delta) {
                  yield { type: "token", value: delta };
                }
              } catch (e) {}
            }
          } finally {
            reader.releaseLock();
          }
          yield { type: "done", value: "" };
        }
      };
    }
  };
}

export interface GeminiConfig {
  apiKey: string;
  modelId: string;
  temperature?: number;
}

export function createGeminiProvider(config: GeminiConfig): AiModelProvider {
  const modelManifest: AiModelManifest = {
    id: config.modelId,
    name: `${config.modelId} (Gemini)`,
    provider: "gemini",
    capabilities: ["chat", "stream"],
    source: "remote"
  };

  return {
    listModels() {
      return [modelManifest];
    },
    loadModel(modelId) {
      if (modelId !== config.modelId) {
        throw new Error(`Unknown model "${modelId}", expected "${config.modelId}"`);
      }

      return {
        manifest: modelManifest,
        async chat(messages, options = {}) {
          const systemMsg = messages.find(m => m.role === "system")?.content;
          const otherMsgs = messages.filter(m => m.role !== "system");
          
          const contents = otherMsgs.map(m => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.content }]
          }));

          const requestBody: any = {
            contents,
            generationConfig: {
              temperature: config.temperature ?? options.temperature ?? 0.7,
              maxOutputTokens: options.maxTokens
            }
          };

          if (systemMsg) {
            requestBody.systemInstruction = {
              parts: [{ text: systemMsg }]
            };
          }

          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${config.modelId}:generateContent?key=${config.apiKey}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify(requestBody),
              signal: options.signal
            }
          );

          if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Gemini API error (${res.status}): ${errText}`);
          }

          const json = await res.json();
          const content = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
          return {
            modelId: config.modelId,
            content,
            usage: {
              inputTokens: json.usageMetadata?.promptTokenCount ?? 0,
              outputTokens: json.usageMetadata?.candidatesTokenCount ?? 0
            }
          };
        },
        async *streamChat(messages, options = {}) {
          yield { type: "status", value: "connecting" };
          const systemMsg = messages.find(m => m.role === "system")?.content;
          const otherMsgs = messages.filter(m => m.role !== "system");

          const contents = otherMsgs.map(m => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.content }]
          }));

          const requestBody: any = {
            contents,
            generationConfig: {
              temperature: config.temperature ?? options.temperature ?? 0.7,
              maxOutputTokens: options.maxTokens
            }
          };

          if (systemMsg) {
            requestBody.systemInstruction = {
              parts: [{ text: systemMsg }]
            };
          }

          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${config.modelId}:streamGenerateContent?key=${config.apiKey}&alt=sse`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify(requestBody),
              signal: options.signal
            }
          );

          if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Gemini API stream error (${res.status}): ${errText}`);
          }
          if (!res.body) {
            throw new Error("Response body is empty");
          }

          yield { type: "status", value: "streaming" };

          const reader = res.body.getReader();
          const decoder = new TextDecoder("utf-8");
          let buffer = "";
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              
              let braceCount = 0;
              let inString = false;
              let escape = false;
              let startIdx = -1;

              for (let i = 0; i < buffer.length; i++) {
                const char = buffer[i];
                if (escape) {
                  escape = false;
                  continue;
                }
                if (char === "\\") {
                  escape = true;
                  continue;
                }
                if (char === '"') {
                  inString = !inString;
                  continue;
                }
                if (!inString) {
                  if (char === "{") {
                    if (braceCount === 0) {
                      startIdx = i;
                    }
                    braceCount++;
                  } else if (char === "}") {
                    braceCount--;
                    if (braceCount === 0 && startIdx !== -1) {
                      const jsonStr = buffer.slice(startIdx, i + 1);
                      try {
                        const json = JSON.parse(jsonStr);
                        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (text) {
                          yield { type: "token", value: text };
                        }
                      } catch (e) {
                        // ignore malformed chunks
                      }
                      startIdx = -1;
                    }
                  }
                }
              }

              if (startIdx !== -1) {
                buffer = buffer.slice(startIdx);
              } else {
                buffer = "";
              }
            }
          } finally {
            reader.releaseLock();
          }
          yield { type: "done", value: "" };
        }
      };
    }
  };
}

