import nextEnv from "@next/env";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

nextEnv.loadEnvConfig(process.cwd());

const require = createRequire(import.meta.url);
const prismaCli = require.resolve("prisma/build/index.js");
const result = spawnSync(process.execPath, [prismaCli, ...process.argv.slice(2)], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit"
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
