import { loadEnvConfig } from "@next/env";
import { defineConfig } from "vitest/config";

const projectDir = process.cwd();
loadEnvConfig(projectDir);

export default defineConfig({
  test: {},
});
