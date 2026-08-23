import { spawn, ChildProcess } from "node:child_process";

export const TEST_PORT = 3211;
export const BASE_URL = `http://localhost:${TEST_PORT}`;

let server: ChildProcess | null = null;

async function waitForServer(url: string, timeoutMs: number) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server did not become ready within ${timeoutMs}ms`);
}

export default async function globalSetup() {
  server = spawn("npx", ["next", "dev", "-p", String(TEST_PORT)], {
    cwd: process.cwd(),
    stdio: "pipe",
    detached: true,
  });

  server.stdout?.on("data", () => {});
  server.stderr?.on("data", () => {});

  await waitForServer(BASE_URL, 60000);

  return async () => {
    if (server?.pid) {
      try {
        process.kill(-server.pid, "SIGTERM");
      } catch {
        server.kill("SIGTERM");
      }
    }
  };
}
