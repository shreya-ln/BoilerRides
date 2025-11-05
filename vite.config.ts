import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Ensure a global `crypto.getRandomValues` exists when running Vite under
// older Node versions (e.g. Node 16). Some libraries expect the browser
// Web Crypto API to be present on `globalThis` during config/server startup.
//
// Preferred long-term fix: upgrade Node to v18+ (recommended).
try {
  // Import Node's built-in WebCrypto and attach it to globalThis if missing.
  // Using a try/catch keeps this safe for environments that do not provide it.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { webcrypto } = require('crypto') as { webcrypto?: unknown };
  if (webcrypto && !(globalThis as any).crypto) {
    (globalThis as any).crypto = webcrypto as any;
  }
} catch (e) {
  // ignore: this is best-effort fallback for dev environments
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
