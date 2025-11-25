import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@/components": path.resolve(__dirname, "src/components"),
      "@/apps": path.resolve(__dirname, "src/apps"),
      "@/lib": path.resolve(__dirname, "src/lib"),
      "@/hooks": path.resolve(__dirname, "src/hooks"),
      "@/shared": path.resolve(__dirname, "shared"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [],
    include: ["tests/**/*.test.ts"],
  },
});

