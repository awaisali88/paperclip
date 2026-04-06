#!/usr/bin/env node
/**
 * Launches `pnpm dev` as a background process so the terminal is freed
 * immediately. Logs go to .paperclip/dev-docker.log.
 * Saves the launcher PID to .paperclip/dev-docker.pid for reliable cleanup.
 * Stop with: pnpm dev:docker:down
 */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const logDir = path.join(repoRoot, ".paperclip");
mkdirSync(logDir, { recursive: true });

const logFile = path.join(logDir, "dev-docker.log");
const pidFile = path.join(logDir, "dev-docker.pid");

if (process.platform === "win32") {
  // Read .env from repo root and inject variables into the launcher .cmd
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

  // Start-Process -PassThru returns the process object so we can capture its PID
  const pid = execSync(
    `powershell.exe -NoProfile -Command "(Start-Process -FilePath '${launcher}' -WindowStyle Hidden -PassThru).Id"`,
    { encoding: "utf8" },
  ).trim();

  writeFileSync(pidFile, pid);
  console.log(`Paperclip dev server started in background (pid ${pid}).`);
} else {
  const { openSync } = await import("node:fs");
  const { spawn } = await import("node:child_process");
  const out = openSync(logFile, "w");
  const child = spawn("pnpm dev", {
    cwd: repoRoot,
    detached: true,
    stdio: ["ignore", out, out],
    shell: true,
  });
  child.unref();
  writeFileSync(pidFile, String(child.pid));
  console.log(`Paperclip dev server started in background (pid ${child.pid}).`);
}

console.log(`Logs: ${logFile}`);
console.log("Stop:  pnpm dev:docker:down");
