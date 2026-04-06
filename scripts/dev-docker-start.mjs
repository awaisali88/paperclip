#!/usr/bin/env node
/**
 * Launches `pnpm dev` as a detached background process so the terminal
 * is freed immediately. Logs go to .paperclip/dev-docker.log.
 * Stop with: pnpm dev:docker:down
 */
import { spawn } from "node:child_process";
import { openSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const logDir = path.join(repoRoot, ".paperclip");
mkdirSync(logDir, { recursive: true });

const logFile = path.join(logDir, "dev-docker.log");
const out = openSync(logFile, "w");

const isWin = process.platform === "win32";
const child = spawn(isWin ? "pnpm.cmd" : "pnpm", ["dev"], {
  cwd: repoRoot,
  detached: true,
  stdio: ["ignore", out, out],
});

child.unref();

console.log(`Paperclip dev server started in background (pid ${child.pid})`);
console.log(`Logs: ${logFile}`);
console.log(`Stop:  pnpm dev:docker:down`);
