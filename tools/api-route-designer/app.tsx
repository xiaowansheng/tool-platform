"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type Method = "get" | "post" | "put" | "patch" | "delete";

interface RouteSpec {
  method: Method;
  path: string;
  summary: string;
  tag: string;
  auth: boolean;
}

const sampleRoutes = [
  "GET /v1/users List users | Users | bearer",
  "POST /v1/users Create user | Users | bearer",
  "GET /v1/users/{id} Get user detail | Users | bearer",
  "PATCH /v1/users/{id} Update user profile | Users | bearer",
  "DELETE /v1/users/{id} Delete user | Users | bearer",
  "GET /healthz Health check | Ops | public"
].join("\n");

function parseRoutes(input: string): RouteSpec[] {
  return input.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const [left, tag = "Default", auth = "public"] = line.split("|").map((part) => part.trim());
    const match = left?.match(/^(GET|POST|PUT|PATCH|DELETE)\s+(\S+)\s+(.+)$/i);
    if (!match) return null;
    return { method: match[1]!.toLowerCase() as Method, path: match[2]!, summary: match[3]!, tag, auth: /bearer|auth|jwt|session/i.test(auth) };
  }).filter((route): route is RouteSpec => Boolean(route));
}

function buildOpenApi(routes: RouteSpec[], title: string) {
  const paths: Record<string, Partial<Record<Method, unknown>>> = {};
  for (const route of routes) {
    paths[route.path] ??= {};
    paths[route.path]![route.method] = {
      summary: route.summary,
      tags: [route.tag],
      security: route.auth ? [{ bearerAuth: [] }] : [],
      responses: { "200": { description: "Success" }, "400": { description: "Bad request" } }
    };
  }
  return {
    openapi: "3.1.0",
    info: { title, version: "1.0.0" },
    paths,
    components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } } }
  };
}

function pathParams(path: string) {
  return Array.from(path.matchAll(/\{([^}]+)\}/g)).map((match) => match[1]!);
}

export default function ApiRouteDesignerTool({ manifest }: ToolAppProps) {
  const [title, setTitle] = useState("Workspace API");
  const [routesInput, setRoutesInput] = useState(sampleRoutes);
  const [copied, setCopied] = useState(false);
  const routes = useMemo(() => parseRoutes(routesInput), [routesInput]);
  const output = useMemo(() => JSON.stringify(buildOpenApi(routes, title || "Generated API"), null, 2), [routes, title]);
  const tags = useMemo(() => Array.from(new Set(routes.map((route) => route.tag))), [routes]);
  const securedCount = useMemo(() => routes.filter((route) => route.auth).length, [routes]);

  async function copyOutput() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header"><div><p className="eyebrow">API design</p><h2>{manifest.name}</h2></div><p>{manifest.description}</p></div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact"><span>API title</span><input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <button type="button" onClick={() => void copyOutput()} disabled={!routes.length}>{copied ? "Copied OpenAPI" : "Copy OpenAPI"}</button>
        <button type="button" onClick={() => setRoutesInput(sampleRoutes)}>Load sample</button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field"><span>Routes</span><textarea value={routesInput} onChange={(event) => { setRoutesInput(event.target.value); setCopied(false); }} spellCheck={false} /></label>
        <label className="tool-field"><span>OpenAPI 3.1 JSON</span><textarea value={output} readOnly spellCheck={false} /></label>
      </div>
      <div className="detail-grid"><article className="detail-card"><h3>Routes</h3><p>{routes.length}</p></article><article className="detail-card"><h3>Tags</h3><p>{tags.length}</p></article><article className="detail-card"><h3>Protected</h3><p>{securedCount}</p></article></div>
      <div className="detail-card"><h3>Route map</h3><div className="tag-list">{routes.map((route) => <span className="tag" key={route.method + route.path}>{route.method.toUpperCase()} {route.path}{pathParams(route.path).length ? " params: " + pathParams(route.path).join(", ") : ""}</span>)}</div></div>
    </section>
  );
}
