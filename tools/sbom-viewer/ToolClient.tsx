"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

interface SbomComponent {
  id: string;
  name: string;
  version: string;
  type: string;
  license: string;
  supplier: string;
  purl: string;
  dependencyCount: number;
  vulnerabilityCount: number;
}

interface ParsedSbom {
  format: string;
  name: string;
  version: string;
  components: SbomComponent[];
}

const sampleCycloneDx = JSON.stringify({
  bomFormat: "CycloneDX",
  specVersion: "1.5",
  metadata: {
    component: { name: "checkout-service", version: "1.2.0" }
  },
  components: [
    {
      type: "library",
      name: "react",
      version: "19.0.0",
      bomRef: "pkg:npm/react@19.0.0",
      purl: "pkg:npm/react@19.0.0",
      licenses: [{ license: { id: "MIT" } }]
    },
    {
      type: "library",
      name: "legacy-auth",
      version: "0.8.1",
      bomRef: "pkg:npm/legacy-auth@0.8.1",
      licenses: [{ license: { id: "GPL-3.0-only" } }]
    }
  ],
  dependencies: [
    { ref: "pkg:npm/react@19.0.0", dependsOn: [] },
    { ref: "pkg:npm/legacy-auth@0.8.1", dependsOn: ["pkg:npm/react@19.0.0"] }
  ],
  vulnerabilities: [
    {
      id: "CVE-2026-0001",
      affects: [{ ref: "pkg:npm/legacy-auth@0.8.1" }]
    }
  ]
}, null, 2);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeLicense(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (!Array.isArray(value)) return "NOASSERTION";

  const licenses = value.map((entry) => {
    if (!isRecord(entry)) return "";
    if (typeof entry.expression === "string") return entry.expression;
    const license = entry.license;

    if (isRecord(license)) {
      return asString(license.id) || asString(license.name);
    }

    return "";
  }).filter(Boolean);

  return licenses.length ? licenses.join(" OR ") : "NOASSERTION";
}

function vulnerabilityCountFor(ref: string, vulnerabilities: unknown) {
  if (!Array.isArray(vulnerabilities)) return 0;

  return vulnerabilities.filter((entry) => {
    if (!isRecord(entry) || !Array.isArray(entry.affects)) return false;

    return entry.affects.some((affect) => isRecord(affect) && affect.ref === ref);
  }).length;
}

function parseCycloneDx(document: Record<string, unknown>): ParsedSbom {
  const metadata = isRecord(document.metadata) ? document.metadata : {};
  const metadataComponent = isRecord(metadata.component) ? metadata.component : {};
  const dependencies = Array.isArray(document.dependencies) ? document.dependencies : [];
  const dependencyMap = new Map<string, number>();

  for (const dependency of dependencies) {
    if (!isRecord(dependency)) continue;
    const ref = asString(dependency.ref);
    const dependsOn = Array.isArray(dependency.dependsOn) ? dependency.dependsOn : [];

    dependencyMap.set(ref, dependsOn.length);
  }

  const components = (Array.isArray(document.components) ? document.components : [])
    .filter(isRecord)
    .map((component, index): SbomComponent => {
      const ref = asString(component.bomRef) || asString(component.purl) || `${asString(component.name, "component")}-${index}`;
      const supplier = isRecord(component.supplier) ? asString(component.supplier.name) : asString(component.supplier);

      return {
        id: ref,
        name: asString(component.name, "Unnamed component"),
        version: asString(component.version, "unknown"),
        type: asString(component.type, "component"),
        license: normalizeLicense(component.licenses),
        supplier: supplier || "unknown",
        purl: asString(component.purl),
        dependencyCount: dependencyMap.get(ref) ?? 0,
        vulnerabilityCount: vulnerabilityCountFor(ref, document.vulnerabilities)
      };
    });

  return {
    format: `CycloneDX ${asString(document.specVersion, "")}`.trim(),
    name: asString(metadataComponent.name, "CycloneDX BOM"),
    version: asString(metadataComponent.version, ""),
    components
  };
}

function parseSpdxJson(document: Record<string, unknown>): ParsedSbom {
  const relationships = Array.isArray(document.relationships) ? document.relationships.filter(isRecord) : [];
  const components = (Array.isArray(document.packages) ? document.packages : [])
    .filter(isRecord)
    .map((pkg, index): SbomComponent => {
      const spdxId = asString(pkg.SPDXID) || asString(pkg.spdxId) || `SPDXRef-Package-${index}`;
      const dependencyCount = relationships.filter((relationship) =>
        relationship.spdxElementId === spdxId && /DEPENDS_ON|CONTAINS|DYNAMIC_LINK|STATIC_LINK/.test(asString(relationship.relationshipType))
      ).length;

      return {
        id: spdxId,
        name: asString(pkg.name, "Unnamed package"),
        version: asString(pkg.versionInfo, "unknown"),
        type: "package",
        license: asString(pkg.licenseConcluded) || asString(pkg.licenseDeclared) || "NOASSERTION",
        supplier: asString(pkg.supplier, "unknown"),
        purl: asString(pkg.externalRefs),
        dependencyCount,
        vulnerabilityCount: 0
      };
    });

  return {
    format: `SPDX ${asString(document.spdxVersion, "")}`.trim(),
    name: asString(document.name, "SPDX Document"),
    version: asString(document.documentNamespace, ""),
    components
  };
}

function parseSpdxTagValue(input: string): ParsedSbom {
  const components: SbomComponent[] = [];
  let current: Partial<SbomComponent> | null = null;
  let documentName = "SPDX Document";
  let spdxVersion = "";

  for (const line of input.split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();

    if (key === "SPDXVersion") spdxVersion = value;
    if (key === "DocumentName") documentName = value;

    if (key === "PackageName") {
      if (current?.name) {
        components.push({
          id: current.id ?? current.name,
          name: current.name,
          version: current.version ?? "unknown",
          type: "package",
          license: current.license ?? "NOASSERTION",
          supplier: current.supplier ?? "unknown",
          purl: current.purl ?? "",
          dependencyCount: 0,
          vulnerabilityCount: 0
        });
      }

      current = { name: value };
    }

    if (!current) continue;
    if (key === "SPDXID") current.id = value;
    if (key === "PackageVersion") current.version = value;
    if (key === "PackageLicenseConcluded" || key === "PackageLicenseDeclared") current.license = value;
    if (key === "PackageSupplier") current.supplier = value;
    if (key === "ExternalRef" && value.includes("PACKAGE-MANAGER")) current.purl = value;
  }

  if (current?.name) {
    components.push({
      id: current.id ?? current.name,
      name: current.name,
      version: current.version ?? "unknown",
      type: "package",
      license: current.license ?? "NOASSERTION",
      supplier: current.supplier ?? "unknown",
      purl: current.purl ?? "",
      dependencyCount: 0,
      vulnerabilityCount: 0
    });
  }

  return {
    format: `SPDX ${spdxVersion}`.trim(),
    name: documentName,
    version: "",
    components
  };
}

function parseSbom(input: string): ParsedSbom {
  const trimmed = input.trim();

  if (!trimmed) throw new Error("SBOM 内容为空");

  if (trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed) as unknown;

    if (!isRecord(parsed)) throw new Error("SBOM JSON 顶层必须是对象");
    if (parsed.bomFormat === "CycloneDX") return parseCycloneDx(parsed);
    if (typeof parsed.spdxVersion === "string" || Array.isArray(parsed.packages)) return parseSpdxJson(parsed);
    throw new Error("未识别的 SBOM JSON 格式");
  }

  if (/SPDXVersion\s*:/i.test(trimmed)) return parseSpdxTagValue(trimmed);
  throw new Error("仅支持 CycloneDX JSON、SPDX JSON 或 SPDX tag-value 文本");
}

function summarizeLicenses(components: SbomComponent[]) {
  const counts = new Map<string, number>();

  for (const component of components) {
    counts.set(component.license, (counts.get(component.license) ?? 0) + 1);
  }

  return Array.from(counts.entries()).sort((left, right) => right[1] - left[1]);
}

export default function SbomViewerTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState(sampleCycloneDx);
  const [query, setQuery] = useState("");
  const [licenseFilter, setLicenseFilter] = useState("all");

  const result = useMemo(() => {
    try {
      return { sbom: parseSbom(input), error: "" };
    } catch (error) {
      return {
        sbom: null,
        error: error instanceof Error ? error.message : "SBOM 解析失败"
      };
    }
  }, [input]);

  const components = result.sbom?.components ?? [];
  const licenseStats = summarizeLicenses(components);
  const filteredComponents = components.filter((component) => {
    const haystack = `${component.name} ${component.version} ${component.license} ${component.purl}`.toLowerCase();
    const matchesQuery = haystack.includes(query.trim().toLowerCase());
    const matchesLicense = licenseFilter === "all" || component.license === licenseFilter;

    return matchesQuery && matchesLicense;
  });
  const vulnerabilityTotal = components.reduce((total, component) => total + component.vulnerabilityCount, 0);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Software Supply Chain</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <label className="tool-field">
        <span>SBOM</span>
        <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} />
      </label>

      {result.sbom ? (
        <>
          <div className="detail-grid">
            <article className="detail-card">
              <h3>Format</h3>
              <p>{result.sbom.format}</p>
            </article>
            <article className="detail-card">
              <h3>Document</h3>
              <p>{result.sbom.name}{result.sbom.version ? ` ${result.sbom.version}` : ""}</p>
            </article>
            <article className="detail-card">
              <h3>Components</h3>
              <p>{components.length}</p>
            </article>
            <article className="detail-card">
              <h3>Vulnerabilities</h3>
              <p>{vulnerabilityTotal}</p>
            </article>
          </div>

          <div className="tool-toolbar tool-toolbar--grid">
            <label className="tool-field tool-field--compact">
              <span>搜索</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="component / license / purl" />
            </label>
            <label className="tool-field tool-field--compact">
              <span>License</span>
              <select value={licenseFilter} onChange={(event) => setLicenseFilter(event.target.value)}>
                <option value="all">All licenses</option>
                {licenseStats.map(([license]) => (
                  <option key={license} value={license}>{license}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="tag-list">
            {licenseStats.map(([license, count]) => (
              <span key={license} className="tag">{license}: {count}</span>
            ))}
          </div>

          <div className="tool-table">
            <div className="tool-table__row tool-table__row--head">
              <span>Component</span>
              <span>Details</span>
            </div>
            {filteredComponents.map((component) => (
              <div key={component.id} className="tool-table__row">
                <span>
                  <strong>{component.name}</strong><br />
                  <span className="mono-output">{component.version}</span>
                </span>
                <span>
                  {component.type} / {component.license} / deps {component.dependencyCount} / vulns {component.vulnerabilityCount}
                  {component.purl ? <><br /><span className="mono-output">{component.purl}</span></> : null}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="tool-error">{result.error}</p>
      )}
    </section>
  );
}
