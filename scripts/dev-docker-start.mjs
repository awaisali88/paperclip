#!/usr/bin/env node
/**
 * Launches `pnpm dev` as a background process so the terminal is freed
 * immediately. Logs go to .paperclip/dev-docker.log.
 * Stop with: pnpm dev:docker:down
 */
import { execSync, spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const logDir = path.join(repoRoot, ".paperclip");
mkdirSync(logDir, { recursive: true });

const logFile = path.join(logDir, "dev-docker.log");

if (process.platform === "win32") {
  // Write a .cmd launcher that sets up the correct working directory and
  // redirects output, then use PowerShell Start-Process to run it hidden.
  // Read .env from repo root and inject variables into the launcher so the
  // hidden process has the same environment as a normal terminal session.
  const { readFileSync } = await import("node:fs");
  let envLines = [];
  const envFile = path.join(repoRoot, ".env");
  try {
    const contents = readFileSync(envFile, "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        envLines.push(`set "${trimmed}"`);
      }
    }
  } catch { /* no .env file, that's fine */ }

  const launcher = path.join(logDir, "dev-docker-launcher.cmd");
  writeFileSync(launcher, [
    "@echo off",
    `cd /d "${repoRoot}"`,
    ...envLines,
    `pnpm dev > "${logFile}" 2>&1`,
    "",
  ].join("\r\n"));

  execSync(
    `powershell.exe -NoProfile -Command "Start-Process -FilePath '${launcher}' -WindowStyle Hidden"`,
    { stdio: "ignore" },
  );
} else {
  const { openSync } = await import("node:fs");
  const out = openSync(logFile, "w");
  const child = spawn("pnpm dev", {
    cwd: repoRoot,
    detached: true,
    stdio: ["ignore", out, out],
    shell: true,
  });
  child.unref();
}

console.log("Paperclip dev server started in background.");
console.log(`Logs: ${logFile}`);
console.log("Stop:  pnpm dev:docker:down");
