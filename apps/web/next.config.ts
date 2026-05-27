import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const repoRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const toolsDir = path.join(repoRoot, "tools");
const packagesDir = path.join(repoRoot, "packages");

function getInternalPackages() {
  const names = [];

  for (const directoryName of readdirSync(packagesDir)) {
    const packagePath = path.join(packagesDir, directoryName, "package.json");

    if (statSync(path.join(packagesDir, directoryName)).isDirectory()) {
      const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

      if (typeof packageJson.name === "string") {
        names.push(packageJson.name);
      }
    }
  }

  for (const directoryName of readdirSync(toolsDir)) {
    const packagePath = path.join(toolsDir, directoryName, "package.json");
    const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

    if (typeof packageJson.name === "string") {
      names.push(packageJson.name);
    }
  }

  return names;
}

const nextConfig: NextConfig = {
  transpilePackages: getInternalPackages()
};

export default nextConfig;
