import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["test/**/*.test.{js,jsx}"],
    setupFiles: ["./test/setup.js"],
    env: { VITE_API_BASE_URL: "http://localhost:3333/api" },
  },
});
