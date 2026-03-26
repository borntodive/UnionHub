import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@web": path.resolve(__dirname, "./src"),
      // Sub-path exports must be listed before the root alias
      "@unionhub/shared/api": path.resolve(
        __dirname,
        "../../packages/shared/src/api/index.ts",
      ),
      "@unionhub/shared/store": path.resolve(
        __dirname,
        "../../packages/shared/src/store/index.ts",
      ),
      "@unionhub/shared/types": path.resolve(
        __dirname,
        "../../packages/shared/src/types/index.ts",
      ),
      "@unionhub/shared/theme": path.resolve(
        __dirname,
        "../../packages/shared/src/theme/index.ts",
      ),
      "@unionhub/shared/utils": path.resolve(
        __dirname,
        "../../packages/shared/src/utils/index.ts",
      ),
      "@unionhub/shared/payslip": path.resolve(
        __dirname,
        "../../packages/shared/src/payslip/index.ts",
      ),
      "@unionhub/shared/ftl": path.resolve(
        __dirname,
        "../../packages/shared/src/ftl/index.ts",
      ),
      "@unionhub/shared": path.resolve(
        __dirname,
        "../../packages/shared/src/index.ts",
      ),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
