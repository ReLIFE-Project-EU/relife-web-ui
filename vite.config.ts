import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";

const getGitValue = (command: string, fallback: string): string => {
  try {
    return execSync(command, { encoding: "utf8" }).trim();
  } catch {
    return fallback;
  }
};

// Prefer environment variables (for Docker builds), fall back to git commands
const commitSha = process.env.APP_COMMIT_SHA || getGitValue("git rev-parse HEAD", "unknown");
const commitDate = process.env.APP_COMMIT_DATE || getGitValue("git log -1 --format=%cI", "unknown");

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_COMMIT_SHA__: JSON.stringify(commitSha),
    __APP_COMMIT_DATE__: JSON.stringify(commitDate),
  },
  server: {
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
