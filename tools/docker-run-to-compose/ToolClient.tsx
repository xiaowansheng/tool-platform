"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

interface ComposeService {
  name: string;
  image: string;
  ports: string[];
  environment: string[];
  volumes: string[];
  restart?: string;
  command: string[];
  network?: string;
  detached: boolean;
}

const sampleCommand = `docker run -d --name redis-cache -p 6379:6379 -e REDIS_PASSWORD=secret -v redis-data:/data --restart unless-stopped redis:7 redis-server --appendonly yes`;

function tokenize(command: string) {
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | "\"" | "" = "";

  for (let index = 0; index < command.length; index += 1) {
    const char = command[index];

    if ((char === "'" || char === "\"") && !quote) {
      quote = char;
      continue;
    }

    if (char === quote) {
      quote = "";
      continue;
    }

    if (/\s/.test(char) && !quote) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

function normalizeServiceName(value: string) {
  return value
    .replace(/[^a-zA-Z0-9_.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "app";
}

function parseDockerRun(command: string): { service: ComposeService; warnings: string[] } {
  const tokens = tokenize(command);
  const warnings: string[] = [];
  const service: ComposeService = {
    name: "app",
    image: "",
    ports: [],
    environment: [],
    volumes: [],
    command: [],
    detached: false
  };

  let index = tokens[0] === "docker" && tokens[1] === "run" ? 2 : 0;

  while (index < tokens.length) {
    const token = tokens[index];
    const next = tokens[index + 1] ?? "";

    if (token === "-d" || token === "--detach") {
      service.detached = true;
      index += 1;
      continue;
    }

    if (token === "--name") {
      service.name = normalizeServiceName(next);
      index += 2;
      continue;
    }

    if (token.startsWith("--name=")) {
      service.name = normalizeServiceName(token.slice("--name=".length));
      index += 1;
      continue;
    }

    if (token === "-p" || token === "--publish") {
      service.ports.push(next);
      index += 2;
      continue;
    }

    if (token.startsWith("-p") && token.length > 2) {
      service.ports.push(token.slice(2));
      index += 1;
      continue;
    }

    if (token.startsWith("--publish=")) {
      service.ports.push(token.slice("--publish=".length));
      index += 1;
      continue;
    }

    if (token === "-e" || token === "--env") {
      service.environment.push(next);
      index += 2;
      continue;
    }

    if (token.startsWith("-e") && token.length > 2) {
      service.environment.push(token.slice(2));
      index += 1;
      continue;
    }

    if (token.startsWith("--env=")) {
      service.environment.push(token.slice("--env=".length));
      index += 1;
      continue;
    }

    if (token === "-v" || token === "--volume") {
      service.volumes.push(next);
      index += 2;
      continue;
    }

    if (token.startsWith("--volume=")) {
      service.volumes.push(token.slice("--volume=".length));
      index += 1;
      continue;
    }

    if (token === "--restart") {
      service.restart = next;
      index += 2;
      continue;
    }

    if (token.startsWith("--restart=")) {
      service.restart = token.slice("--restart=".length);
      index += 1;
      continue;
    }

    if (token === "--network") {
      service.network = next;
      index += 2;
      continue;
    }

    if (token.startsWith("--network=")) {
      service.network = token.slice("--network=".length);
      index += 1;
      continue;
    }

    if (token.startsWith("--")) {
      warnings.push(`未转换参数: ${token}${next && !next.startsWith("-") ? ` ${next}` : ""}`);
      index += next && !next.startsWith("-") ? 2 : 1;
      continue;
    }

    service.image = token;
    service.command = tokens.slice(index + 1);
    break;
  }

  if (!service.image) {
    warnings.push("未找到镜像名，请检查 docker run 命令。");
  }

  return { service, warnings };
}

function yamlList(values: string[], indent = "      ") {
  if (values.length === 0) {
    return "";
  }

  return values.map((value) => `${indent}- "${value.replace(/"/g, '\\"')}"`).join("\n");
}

function toComposeYaml(service: ComposeService) {
  const lines = [
    "services:",
    `  ${service.name}:`,
    `    image: ${service.image || "IMAGE_NAME"}`
  ];

  if (service.command.length > 0) {
    lines.push("    command:");
    lines.push(...service.command.map((part) => `      - "${part.replace(/"/g, '\\"')}"`));
  }

  if (service.ports.length > 0) {
    lines.push("    ports:");
    lines.push(yamlList(service.ports));
  }

  if (service.environment.length > 0) {
    lines.push("    environment:");
    lines.push(yamlList(service.environment));
  }

  if (service.volumes.length > 0) {
    lines.push("    volumes:");
    lines.push(yamlList(service.volumes));
  }

  if (service.restart) {
    lines.push(`    restart: ${service.restart}`);
  }

  if (service.network && service.network !== "bridge") {
    lines.push("    networks:");
    lines.push(`      - ${service.network}`);
    lines.push("", "networks:", `  ${service.network}:`, "    external: true");
  }

  return lines.filter((line) => line !== "").join("\n") + "\n";
}

export default function DockerRunToComposeTool({ manifest }: ToolClientProps) {
  const [command, setCommand] = useState(sampleCommand);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const parsed = useMemo(() => parseDockerRun(command), [command]);
  const composeYaml = useMemo(() => toComposeYaml(parsed.service), [parsed.service]);

  async function copyCompose() {
    try {
      await navigator.clipboard.writeText(composeYaml);
      setCopied(true);
      setError("");
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "复制失败");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">运维工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar">
        <button type="button" onClick={() => setCommand(sampleCommand)}>加载示例</button>
        <button type="button" onClick={() => void copyCompose()}>{copied ? "已复制" : "复制 compose.yaml"}</button>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>Service</h3>
          <p>{parsed.service.name}</p>
        </article>
        <article className="detail-card">
          <h3>Ports</h3>
          <p>{parsed.service.ports.length}</p>
        </article>
        <article className="detail-card">
          <h3>Env</h3>
          <p>{parsed.service.environment.length}</p>
        </article>
        <article className="detail-card">
          <h3>Volumes</h3>
          <p>{parsed.service.volumes.length}</p>
        </article>
      </div>

      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>docker run</span>
          <textarea value={command} onChange={(event) => {
            setCommand(event.target.value);
            setCopied(false);
          }} spellCheck={false} />
        </label>

        <label className="tool-field">
          <span>compose.yaml</span>
          <textarea value={composeYaml} readOnly spellCheck={false} />
        </label>
      </div>

      {parsed.warnings.length > 0 ? (
        <div className="workspace workspace--stack">
          {parsed.warnings.map((warning) => <p className="tool-error" key={warning}>{warning}</p>)}
        </div>
      ) : null}
      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">转换器覆盖常见 docker run 参数；复杂参数、健康检查、secret、capability 和 resource limit 仍需人工补入 compose 文件。</p>
    </section>
  );
}
