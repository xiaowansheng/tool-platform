"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface Finding {
  title: string;
  detail: string;
  command: string;
}

function diagnose(reason: string, restarts: number, events: string): Finding[] {
  const text = (reason + "\n" + events).toLowerCase();
  const findings: Finding[] = [];
  if (text.includes("crashloop") || restarts > 3) findings.push({ title: "CrashLoopBackOff", detail: "Container starts and exits repeatedly. Check the previous container logs and entrypoint arguments first.", command: "kubectl logs pod/<pod> -n <namespace> --previous" });
  if (text.includes("imagepull") || text.includes("errimagepull")) findings.push({ title: "Image pull failure", detail: "The image cannot be fetched. Verify registry credentials, image tag, and network egress.", command: "kubectl describe pod <pod> -n <namespace> | sed -n '/Events/,$p'" });
  if (text.includes("oom") || text.includes("memory")) findings.push({ title: "Memory pressure", detail: "The container may be killed by the kernel OOM killer. Compare requests, limits, and runtime usage.", command: "kubectl top pod <pod> -n <namespace> --containers" });
  if (text.includes("probe") || text.includes("unhealthy")) findings.push({ title: "Probe failure", detail: "Liveness or readiness probes are failing. Check probe path, port, startup time, and dependency readiness.", command: "kubectl get pod <pod> -n <namespace> -o jsonpath='{.spec.containers[*].livenessProbe}'" });
  if (text.includes("pending") || text.includes("insufficient")) findings.push({ title: "Scheduling issue", detail: "The scheduler cannot place the pod. Check node capacity, selectors, taints, and PVC binding.", command: "kubectl describe pod <pod> -n <namespace>" });
  if (!findings.length) findings.push({ title: "General triage", detail: "Start with describe output, current logs, previous logs, and recent events sorted by time.", command: "kubectl describe pod <pod> -n <namespace> && kubectl logs pod/<pod> -n <namespace>" });
  return findings;
}

export default function K8sPodTroubleshooterTool({ manifest }: ToolAppProps) {
  const [namespace, setNamespace] = useState("default");
  const [pod, setPod] = useState("api-7c9d7f9b6f-q2v8n");
  const [reason, setReason] = useState("CrashLoopBackOff");
  const [restarts, setRestarts] = useState(7);
  const [events, setEvents] = useState("Back-off restarting failed container api. Liveness probe failed: HTTP probe failed with statuscode: 500");
  const [copied, setCopied] = useState(false);
  const findings = useMemo(() => diagnose(reason, restarts, events), [events, reason, restarts]);
  const commands = useMemo(() => findings.map((finding) => finding.command.replaceAll("<pod>", pod).replaceAll("<namespace>", namespace)).join("\n"), [findings, namespace, pod]);

  async function copyCommands() {
    await navigator.clipboard.writeText(commands);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header"><div><p className="eyebrow">Kubernetes triage</p><h2>{manifest.name}</h2></div><p>{manifest.description}</p></div>
      <div className="tool-toolbar tool-toolbar--grid"><label className="tool-field tool-field--compact"><span>Namespace</span><input value={namespace} onChange={(event) => setNamespace(event.target.value)} /></label><label className="tool-field tool-field--compact"><span>Pod</span><input value={pod} onChange={(event) => setPod(event.target.value)} /></label><label className="tool-field tool-field--compact"><span>Reason</span><input value={reason} onChange={(event) => setReason(event.target.value)} /></label><label className="tool-field tool-field--compact"><span>Restarts</span><input type="number" min={0} value={restarts} onChange={(event) => setRestarts(Number(event.target.value))} /></label><button type="button" onClick={() => void copyCommands()}>{copied ? "Copied commands" : "Copy commands"}</button></div>
      <label className="tool-field"><span>Events / describe excerpt</span><textarea value={events} onChange={(event) => { setEvents(event.target.value); setCopied(false); }} spellCheck={false} /></label>
      <div className="detail-grid">{findings.map((finding) => <article className="detail-card" key={finding.title}><h3>{finding.title}</h3><p>{finding.detail}</p><p className="mono-output">{finding.command.replaceAll("<pod>", pod).replaceAll("<namespace>", namespace)}</p></article>)}</div>
    </section>
  );
}
