import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configPath = path.join(projectRoot, ".output", "server", "wrangler.json");
const envFilePath = path.join(projectRoot, ".dev.vars");
const wranglerPath = path.join(projectRoot, "node_modules", "wrangler", "bin", "wrangler.js");

async function startPreview() {
  try {
    await Promise.all([access(configPath), access(envFilePath), access(wranglerPath)]);
  } catch {
    console.error(
      "Preview requires a production build and the ignored project-root .dev.vars file.",
    );
    process.exitCode = 1;
    return;
  }

  const child = spawn(
    process.execPath,
    [
      "--no-warnings",
      wranglerPath,
      "--config",
      configPath,
      "dev",
      "--env-file",
      envFilePath,
      ...process.argv.slice(2),
    ],
    { cwd: projectRoot, stdio: "inherit" },
  );

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => child.kill(signal));
  }

  await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => {
      process.exitCode = code ?? 1;
      resolve();
    });
  });
}

startPreview().catch(() => {
  console.error("Unable to start local Wrangler preview.");
  process.exitCode = 1;
});
