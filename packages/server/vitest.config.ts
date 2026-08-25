import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    exclude: ["**/node_modules/**", "**/dist/**"],
    env: {
      JWT_SECRET: "test-jwt-secret-do-not-use-in-production",
      JWT_REFRESH_SECRET: "test-jwt-refresh-secret-do-not-use-in-production",
      MONGODB_URI: "mongodb://127.0.0.1:27017/test-placeholder",
      CLIENT_URL: "http://localhost:5173",
    },
  },
});
