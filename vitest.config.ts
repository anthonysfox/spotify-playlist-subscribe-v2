import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    // Integration tests need a real Postgres running (`pnpm test:db:up`) —
    // keep them out of the default run so `pnpm test` never depends on
    // infrastructure being up. See vitest.integration.config.ts.
    exclude: ["**/node_modules/**", "**/*.integration.test.ts"],
  },
});
