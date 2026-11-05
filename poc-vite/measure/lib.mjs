import { spawn } from "node:child_process";
import net from "node:net";

export const TOOLS = "/home/user/dev/poc-tools-40/node_modules";
export const CHROME = "/usr/bin/google-chrome";
export const { chromium } = await import(`${TOOLS}/playwright-core/index.mjs`);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function portOpen(port) {
  return new Promise((res) => {
    const s = net.connect(port, "127.0.0.1");
    s.on("connect", () => { s.destroy(); res(true); });
    s.on("error", () => res(false));
  });
}

/** Start a server as a child of this process, wait for the port, return stop(). */
export async function startServer(cmd, args, cwd, port) {
  const p = spawn(cmd, args, { cwd, stdio: "ignore", detached: true });
  for (let i = 0; i < 100; i++) {
    if (await portOpen(port)) break;
    await sleep(200);
  }
  if (!(await portOpen(port))) throw new Error(`server on ${port} did not start`);
  await sleep(500);
  return () => { try { process.kill(-p.pid); } catch {} };
}

export const NEXT_DIR = process.env.NEXT_DIR; // dir containing .next to serve
export const REPO = "/home/user/dev/worktrees/kort-poc-40-vite";
export const NEXT_PORT = 3100, VITE_PORT = 4173;

/** targets: label -> {url, start()} */
export function targets({ maps = false } = {}) {
  const nextCwd = maps ? "/home/user/dev/poc-tools-40/nextcopy" : REPO;
  const viteOut = maps ? "/home/user/dev/poc-tools-40/vite-map" : `${REPO}/poc-vite/dist`;
  return {
    next: {
      url: `http://127.0.0.1:${NEXT_PORT}/`,
      dist: `${nextCwd}/.next/static`, urlBase: "/_next/static/",
      start: () => startServer("npx", ["next", "start", "-p", String(NEXT_PORT), "-H", "127.0.0.1"], nextCwd, NEXT_PORT),
    },
    vite: {
      url: `http://127.0.0.1:${VITE_PORT}/`,
      dist: viteOut, urlBase: "/",
      start: () => startServer("npx", ["vite", "preview", "--config", `${REPO}/poc-vite/vite.config.ts`, "--outDir", viteOut, "--port", String(VITE_PORT), "--strictPort", "--host", "127.0.0.1"], REPO, VITE_PORT),
    },
  };
}

export async function launch() {
  return chromium.launch({ executablePath: CHROME, headless: true });
}
