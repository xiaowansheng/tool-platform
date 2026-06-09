"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

export default function K8sNamespaceDesignerTool({ manifest }: ToolAppProps) {
  const [name, setName] = useState("team-payments");
  const [cpuRequests, setCpuRequests] = useState("4");
  const [cpuLimits, setCpuLimits] = useState("8");
  const [memoryRequests, setMemoryRequests] = useState("8Gi");
  const [memoryLimits, setMemoryLimits] = useState("16Gi");
  const [pods, setPods] = useState("30");
  const [defaultCpu, setDefaultCpu] = useState("500m");
  const [defaultMemory, setDefaultMemory] = useState("512Mi");
  const [copied, setCopied] = useState(false);
  const yaml = useMemo(() => [
    "apiVersion: v1",
    "kind: Namespace",
    "metadata:",
    "  name: " + name,
    "  labels:",
    "    owner: platform",
    "---",
    "apiVersion: v1",
    "kind: ResourceQuota",
    "metadata:",
    "  name: " + name + "-quota",
    "  namespace: " + name,
    "spec:",
    "  hard:",
    "    requests.cpu: \"" + cpuRequests + "\"",
    "    limits.cpu: \"" + cpuLimits + "\"",
    "    requests.memory: " + memoryRequests,
    "    limits.memory: " + memoryLimits,
    "    pods: \"" + pods + "\"",
    "---",
    "apiVersion: v1",
    "kind: LimitRange",
    "metadata:",
    "  name: " + name + "-defaults",
    "  namespace: " + name,
    "spec:",
    "  limits:",
    "    - type: Container",
    "      defaultRequest:",
    "        cpu: " + defaultCpu,
    "        memory: " + defaultMemory,
    "      default:",
    "        cpu: " + defaultCpu,
    "        memory: " + defaultMemory
  ].join("\n"), [cpuLimits, cpuRequests, defaultCpu, defaultMemory, memoryLimits, memoryRequests, name, pods]);

  async function copyYaml() {
    await navigator.clipboard.writeText(yaml);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header"><div><p className="eyebrow">Kubernetes</p><h2>{manifest.name}</h2></div><p>{manifest.description}</p></div>
      <div className="tool-toolbar tool-toolbar--grid"><label className="tool-field tool-field--compact"><span>Namespace</span><input value={name} onChange={(event) => { setName(event.target.value.replace(/[^a-z0-9-]/g, "")); setCopied(false); }} /></label><label className="tool-field tool-field--compact"><span>Pods</span><input value={pods} onChange={(event) => setPods(event.target.value)} /></label><button type="button" onClick={() => void copyYaml()}>{copied ? "Copied YAML" : "Copy YAML"}</button></div>
      <div className="detail-grid"><label className="tool-field tool-field--compact"><span>CPU requests</span><input value={cpuRequests} onChange={(event) => setCpuRequests(event.target.value)} /></label><label className="tool-field tool-field--compact"><span>CPU limits</span><input value={cpuLimits} onChange={(event) => setCpuLimits(event.target.value)} /></label><label className="tool-field tool-field--compact"><span>Memory requests</span><input value={memoryRequests} onChange={(event) => setMemoryRequests(event.target.value)} /></label><label className="tool-field tool-field--compact"><span>Memory limits</span><input value={memoryLimits} onChange={(event) => setMemoryLimits(event.target.value)} /></label><label className="tool-field tool-field--compact"><span>Default CPU</span><input value={defaultCpu} onChange={(event) => setDefaultCpu(event.target.value)} /></label><label className="tool-field tool-field--compact"><span>Default memory</span><input value={defaultMemory} onChange={(event) => setDefaultMemory(event.target.value)} /></label></div>
      <label className="tool-field"><span>Generated manifests</span><textarea value={yaml} readOnly spellCheck={false} /></label>
    </section>
  );
}
