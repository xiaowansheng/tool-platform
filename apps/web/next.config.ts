import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const repoRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const toolsDir = path.join(repoRoot, "tools");
const packagesDir = path.join(repoRoot, "packages");

function getInternalPackages() {
  const names = [];

  for (const directoryName of readdirSync(packagesDir)) {
    const directoryPath = path.join(packagesDir, directoryName);
    const packagePath = path.join(packagesDir, directoryName, "package.json");

    if (statSync(directoryPath).isDirectory() && existsSync(packagePath)) {
      const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

      if (typeof packageJson.name === "string") {
        names.push(packageJson.name);
      }
    }
  }

  for (const directoryName of readdirSync(toolsDir)) {
    const directoryPath = path.join(toolsDir, directoryName);
    const packagePath = path.join(toolsDir, directoryName, "package.json");

    if (statSync(directoryPath).isDirectory() && existsSync(packagePath)) {
      const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

      if (typeof packageJson.name === "string") {
        names.push(packageJson.name);
      }
    }
  }

  return names;
}

const nextConfig: NextConfig = {
  transpilePackages: getInternalPackages(),
  serverExternalPackages: ["@formatjs/icu-messageformat-parser"]
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
export default withNextIntl(nextConfig);
