import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const LANES = ["ui", "standard", "protected"];
const requestedLane = process.argv[2] ?? "standard";

if (!LANES.includes(requestedLane)) {
  console.error(`Unknown validation lane: ${requestedLane}`);
  console.error(`Choose one of: ${LANES.join(", ")}`);
  process.exit(2);
}

const protectedPatterns = [
  /^\.openai\//,
  /^app\/api\//,
  /^app\/(?:admin-config|archive-auth|archive-data|character-extractor|character-records|chatgpt-auth|chronicle-visibility|gpt-api-adapter|gpt-api-auth|lore-editor|lore-publication)\.ts$/,
  /^db\//,
  /^drizzle\//,
  /^openapi\//,
  /^storage\//,
  /^tests\/gpt-api-/,
  /^worker\//,
  /^wrangler(?:\.sites)?\.jsonc$/,
];

const uiPatterns = [
  /^app\/.*\.(?:css|tsx)$/,
  /^public\//,
  /^tests\/rendered-html\.test\.mjs$/,
];

function gitLines(args) {
  try {
    return execFileSync("git", args, { encoding: "utf8" })
      .split(/\r?\n/u)
      .map((line) => line.trim().replaceAll("\\", "/"))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function changedFiles() {
  return [
    ...new Set([
      ...gitLines(["diff", "--name-only", "HEAD"]),
      ...gitLines(["diff", "--cached", "--name-only"]),
      ...gitLines(["diff", "--name-only", "origin/master...HEAD"]),
      ...gitLines(["ls-files", "--others", "--exclude-standard"]),
    ]),
  ].sort();
}

function requiredLane(files) {
  if (files.some((file) => protectedPatterns.some((pattern) => pattern.test(file)))) {
    return "protected";
  }

  if (files.some((file) => !uiPatterns.some((pattern) => pattern.test(file)))) {
    return "standard";
  }

  return "ui";
}

function run(command, args) {
  let executable = command;
  let commandArgs = args;

  if (command === "npm" && process.platform === "win32") {
    if (!process.env.npm_execpath) {
      throw new Error("Run this verifier through an npm script so npm_execpath is available");
    }
    executable = process.execPath;
    commandArgs = [process.env.npm_execpath, ...args];
  } else if (command === "node") {
    executable = process.execPath;
  }

  const result = spawnSync(executable, commandArgs, { stdio: "inherit", shell: false });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function walkFiles(directory) {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(path) : [path];
  });
}

function auditBuild() {
  const dist = resolve("dist");
  const copiedDevVars = join(dist, "server", ".dev.vars");

  // vinext may copy the local development file into dist. It must never enter a Site archive.
  if (existsSync(copiedDevVars) && statSync(copiedDevVars).isFile()) {
    rmSync(copiedDevVars);
  }

  const files = walkFiles(dist);
  const forbiddenEnvironmentFiles = files.filter((file) => {
    const name = file.split(/[\\/]/u).at(-1) ?? "";
    return name === ".env" || name.startsWith(".env.") || name.startsWith(".dev.vars");
  });

  if (forbiddenEnvironmentFiles.length > 0) {
    throw new Error(
      `Build contains forbidden environment files:\n${forbiddenEnvironmentFiles
        .map((file) => `- ${relative(process.cwd(), file)}`)
        .join("\n")}`,
    );
  }

  const hostingPath = join(dist, ".openai", "hosting.json");
  if (!existsSync(hostingPath)) {
    throw new Error("Build is missing dist/.openai/hosting.json");
  }

  const hosting = JSON.parse(readFileSync(hostingPath, "utf8"));
  if (!hosting.project_id || hosting.d1 !== "DB" || hosting.r2 !== "CHAPTER_ASSETS") {
    throw new Error("Site hosting metadata does not preserve the expected project and logical bindings");
  }

  const stagingMarker = "wandering-mud-e6c1";
  const stagingHits = files.filter((file) => {
    try {
      return readFileSync(file).includes(Buffer.from(stagingMarker));
    } catch {
      return false;
    }
  });

  if (stagingHits.length > 0) {
    throw new Error(
      `Build contains a staging-resource marker:\n${stagingHits
        .map((file) => `- ${relative(process.cwd(), file)}`)
        .join("\n")}`,
    );
  }
}

const files = changedFiles();
const minimumLane = requiredLane(files);
const effectiveLane =
  LANES.indexOf(minimumLane) > LANES.indexOf(requestedLane) ? minimumLane : requestedLane;

console.log(`Requested lane: ${requestedLane}`);
console.log(`Effective lane: ${effectiveLane}`);
console.log(files.length > 0 ? `Changed files: ${files.length}` : "Changed files: none detected");

if (effectiveLane !== requestedLane) {
  console.log(`Safety escalation: ${requestedLane} -> ${effectiveLane}`);
}

const startedAt = Date.now();

if (effectiveLane === "ui") {
  run("npm", ["run", "build"]);
  run("node", ["--test", "tests/rendered-html.test.mjs"]);
} else if (effectiveLane === "standard") {
  run("npm", ["run", "lint"]);
  run("npm", ["run", "typecheck"]);
  run("npm", ["test"]);
} else {
  run("npm", ["run", "lint"]);
  run("npm", ["run", "typecheck"]);
  run("npm", ["test"]);
  run("npm", ["run", "test:gpt-api"]);
}

auditBuild();

console.log(`Validation passed (${effectiveLane}) in ${Math.ceil((Date.now() - startedAt) / 1000)}s.`);
console.log("Build audit passed: logical bindings preserved; no environment files or staging marker found.");
