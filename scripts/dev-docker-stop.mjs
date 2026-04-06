#!/usr/bin/env node
/**
 * Stops both the Paperclip dev server and the Docker Postgres container.
 * 1. Reads .paperclip/dev-docker.pid and kills the entire process tree
 * 2. Falls back to killing anything on port 3100
 * 3. Brings down Docker containers
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = process.env.PORT || "3100";
const pidFile = path.join(repoRoot, ".paperclip", "dev-docker.pid");

// 1. Try the normal dev:stop (service registry based)
try {
  execSync("pnpm dev:stop", { stdio: "inherit" });
} catch { /* may fail if no service registered */ }

// 2. Kill the launcher process tree using the saved PID
if (existsSync(pidFile)) {
  const pid = readFileSync(pidFile, "utf8").trim();
  if (pid && /^\d+$/.test(pid)) {
    if (process.platform === "win32") {
      try {
        execSync(`taskkill /F /T /PID ${pid}`, { stdio: "ignore", shell: true });
        console.log(`Killed launcher process tree (pid ${pid})`);
      } catch { /* already dead */ }
    } else {
      try {
        // Kill the process group
        execSync(`kill -- -${pid}`);
        console.log(`Killed launcher process tree (pid ${pid})`);
      } catch { /* already dead */ }
    }
  }
  try { unlinkSync(pidFile); } catch { /* ignore */ }
}

// 3. Kill any remaining process on the dev port (safety net)
if (process.platform === "win32") {
  try {
    const netstat = execSync(`netstat -ano | findstr "LISTENING" | findstr ":${PORT}"`, {
      encoding: "utf8",
      shell: true,
    });
    const pids = new Set();
    for (const line of netstat.trim().split("\n")) {
      const pid = line.trim().split(/\s+/).pop();
      if (pid && pid !== "0") pids.add(pid);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /F /T /PID ${pid}`, { stdio: "ignore", shell: true });
        console.log(`Killed remaining process on port ${PORT} (pid ${pid})`);
      } catch { /* already dead */ }
    }
  } catch { /* no process on port — good */ }
} else {
  try {
    const lsof = execSync(`lsof -ti:${PORT}`, { encoding: "utf8" });
    for (const pid of lsof.trim().split("\n").filter(Boolean)) {
      try {
        execSync(`kill ${pid}`);
        console.log(`Killed remaining process on port ${PORT} (pid ${pid})`);
      } catch { /* already dead */ }
    }
  } catch { /* no process on port — good */ }
}

// 4. Bring down Docker
try {
  execSync("docker compose -f docker-compose.dev.yml down", { stdio: "inherit" });
} catch (err) {
  console.error("Failed to stop Docker containers:", err.message);
}

console.log("Paperclip dev and Docker Postgres stopped.");
