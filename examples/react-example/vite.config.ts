import path from "path";
import { readFileSync } from "fs";
import { createHash } from "crypto";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Generate hash for WASM file for cache busting
function getWasmHash() {
  try {
    const wasmPath = path.resolve(__dirname, "public/wasm/sql2postgrest.wasm");
    const content = readFileSync(wasmPath);
    return createHash("md5").update(content).digest("hex").slice(0, 8);
  } catch {
    return "dev";
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Inject WASM version into the app
    __WASM_VERSION__: JSON.stringify(getWasmHash()),
  },
  build: {
    rollupOptions: {
      output: {
        // Add hash to asset filenames for cache busting
        assetFileNames: (assetInfo) => {
          if (!assetInfo.name) return "assets/[name].[hash][extname]";
          
          const info = assetInfo.name.split(".");
          const ext = info[info.length - 1];
          
          if (/wasm/i.test(ext)) {
            return `wasm/[name].[hash][extname]`;
          }
          return `assets/[name].[hash][extname]`;
        },
      },
    },
  },
  server: {
    headers: {
      // Enable aggressive caching for WASM files in dev
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  },
});
