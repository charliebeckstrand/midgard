#!/usr/bin/env node
// Vitest MCP Server
//
// First-party, zero-dependency MCP server: a minimal inline MCP stdio runtime
// stands in for the SDK, and the tools shell out to the target workspace's own
// vitest with the JSON reporter. No node_modules, no build step — runs on a
// fresh clone with nothing but Node. See README.md.

import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createTestAnalysis, RULE_IDS_FOR_SCHEMA } from "./analysis.mjs";

// Minimal MCP stdio runtime
// Newline-delimited JSON-RPC 2.0 over stdio. The constants and class surface
// match the SDK so the handler code below reads like the vendored servers.

const PROTOCOL_VERSION = "2025-06-18";
const ListToolsRequestSchema = { method: "tools/list" };
const CallToolRequestSchema = { method: "tools/call" };

class StdioServerTransport {
  start(onMessage) {
    let buffer = "";
    process.stdin.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      let newline;
      while ((newline = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (line) onMessage(line);
      }
    });
    process.stdin.on("end", () => process.exit(0));
  }

  send(message) {
    process.stdout.write(`${JSON.stringify(message)}\n`);
  }
}

class Server {
  constructor(serverInfo, options) {
    this.serverInfo = serverInfo;
    this.options = options ?? {};
    this.handlers = new Map();
  }

  setRequestHandler(schema, handler) {
    this.handlers.set(schema.method, handler);
  }

  async connect(transport) {
    this.transport = transport;
    transport.start((line) => this.#receive(line));
  }

  async #receive(line) {
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      this.transport.send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
      return;
    }
    const { id, method, params } = message;
    // Notifications carry no id and expect no response.
    if (id === undefined || id === null) return;
    if (method === "initialize") {
      this.transport.send({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: params?.protocolVersion ?? PROTOCOL_VERSION,
          capabilities: this.options.capabilities ?? { tools: {} },
          serverInfo: this.serverInfo,
        },
      });
      return;
    }
    if (method === "ping") {
      this.transport.send({ jsonrpc: "2.0", id, result: {} });
      return;
    }
    const handler = this.handlers.get(method);
    if (!handler) {
      this.transport.send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
      return;
    }
    try {
      const result = await handler({ params });
      this.transport.send({ jsonrpc: "2.0", id, result });
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      this.transport.send({ jsonrpc: "2.0", id, error: { code: -32603, message: text } });
    }
  }
}

// Argument validation
// Derives a zod-style safeParse from each tool's JSON Schema so the dispatch
// reads like the vendored servers (`if (!parsed.success) ... parsed.data`).

function parseArgs(schema, rawArgs) {
  const args = rawArgs && typeof rawArgs === "object" ? rawArgs : {};
  const issues = [];
  const data = {};
  const properties = schema.properties ?? {};
  for (const key of schema.required ?? []) {
    if (args[key] === undefined || args[key] === null) issues.push({ path: [key], message: "is required" });
  }
  for (const [key, spec] of Object.entries(properties)) {
    const value = args[key];
    if (value === undefined || value === null) {
      if (spec.default !== undefined) data[key] = spec.default;
      continue;
    }
    if (spec.type === "array") {
      if (!Array.isArray(value)) {
        issues.push({ path: [key], message: "must be an array" });
        continue;
      }
      if (spec.items?.type && !value.every((v) => typeof v === spec.items.type)) {
        issues.push({ path: [key], message: `must be an array of ${spec.items.type}` });
        continue;
      }
      if (spec.minItems && value.length < spec.minItems) {
        issues.push({ path: [key], message: `must contain at least ${spec.minItems} item(s)` });
        continue;
      }
    } else if (spec.type && typeof value !== spec.type) {
      issues.push({ path: [key], message: `must be a ${spec.type}` });
      continue;
    }
    if (spec.enum && !spec.enum.includes(value)) {
      issues.push({ path: [key], message: `must be one of: ${spec.enum.join(", ")}` });
      continue;
    }
    data[key] = value;
  }
  return issues.length ? { success: false, issues } : { success: true, data };
}

// Vitest invocation

const REPO_ROOT = process.cwd();

// Static source analysis (overlap + audit) lives in analysis.mjs; the run-based
// tools above shell out to vitest, these two only read and parse test files.
const testAnalysis = createTestAnalysis(REPO_ROOT);

function resolveCwd(cwd) {
  return path.resolve(REPO_ROOT, cwd ?? ".");
}

function tmpFile(prefix, ext) {
  return path.join(os.tmpdir(), `vitest-mcp-${prefix}-${randomUUID()}.${ext}`);
}

function tmpDir(prefix) {
  return path.join(os.tmpdir(), `vitest-mcp-${prefix}-${randomUUID()}`);
}

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return null;
  }
}

async function removePath(target) {
  try {
    await fs.rm(target, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
}

// Spawns the workspace's vitest via pnpm so the local binary and config resolve.
function spawnVitest(vitestArgs, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn("pnpm", ["exec", "vitest", ...vitestArgs], {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });
    let stderr = "";
    const cap = (current, chunk) => (current + chunk).slice(-200000);
    child.stdout.on("data", () => {});
    child.stderr.on("data", (chunk) => {
      stderr = cap(stderr, chunk.toString("utf8"));
    });
    child.on("error", (error) => {
      reject(new Error(`Failed to launch vitest via pnpm: ${error.message}. Ensure pnpm and vitest are installed in the target workspace.`));
    });
    child.on("close", (code) => resolve({ code, stderr }));
  });
}

function vitestError(stderr, cwd) {
  const relative = path.relative(REPO_ROOT, cwd) || ".";
  const tail = stderr.trim().split("\n").slice(-12).join("\n");
  return `Vitest produced no report (cwd: ${relative}). Confirm the directory is a workspace package with a vitest config and a local vitest install, then retry. Vitest output:\n${tail || "(none)"}`;
}

function applyFilters(args, input) {
  for (const filter of input.filters ?? []) args.push(filter);
  if (input.testNamePattern) args.push("-t", input.testNamePattern);
}

// Runs vitest with the JSON test reporter and returns the parsed report.
async function runWithReport(vitestArgs, cwd) {
  const reportFile = tmpFile("report", "json");
  try {
    const { code, stderr } = await spawnVitest([...vitestArgs, "--reporter=json", `--outputFile=${reportFile}`], cwd);
    const report = await readJson(reportFile);
    if (!report) throw new Error(vitestError(stderr, cwd));
    return { report, code };
  } finally {
    await removePath(reportFile);
  }
}

async function runTests(input) {
  const cwd = resolveCwd(input.cwd);
  const args = ["run"];
  if (input.changed) args.push("--changed");
  applyFilters(args, input);
  const { report } = await runWithReport(args, cwd);
  return { cwd, report };
}

async function listTests(input) {
  const cwd = resolveCwd(input.cwd);
  const listFile = tmpFile("list", "json");
  const args = ["list", `--json=${listFile}`];
  if (input.filesOnly) args.push("--filesOnly");
  for (const filter of input.filters ?? []) args.push(filter);
  try {
    const { stderr } = await spawnVitest(args, cwd);
    const entries = await readJson(listFile);
    if (!entries) throw new Error(vitestError(stderr, cwd));
    return { cwd, filesOnly: Boolean(input.filesOnly), entries };
  } finally {
    await removePath(listFile);
  }
}

async function runCoverage(input) {
  const cwd = resolveCwd(input.cwd);
  const reportFile = tmpFile("report", "json");
  const coverageDir = tmpDir("coverage");
  const args = ["run", "--coverage", "--coverage.reporter=json-summary", `--coverage.reportsDirectory=${coverageDir}`];
  applyFilters(args, input);
  args.push("--reporter=json", `--outputFile=${reportFile}`);
  try {
    const { stderr } = await spawnVitest(args, cwd);
    const report = await readJson(reportFile);
    if (!report) throw new Error(vitestError(stderr, cwd));
    const summary = await readJson(path.join(coverageDir, "coverage-summary.json"));
    return { cwd, report, coverage: summary?.total ?? null };
  } finally {
    await removePath(reportFile);
    await removePath(coverageDir);
  }
}

async function runRelated(input) {
  const cwd = resolveCwd(input.cwd);
  const args = ["related", "--run"];
  if (input.testNamePattern) args.push("-t", input.testNamePattern);
  for (const file of input.files) args.push(file);
  const { report } = await runWithReport(args, cwd);
  return { cwd, files: input.files, report };
}

// Report formatting

function statusLine(report) {
  return report.numFailedTests > 0 || report.numFailedTestSuites > 0
    ? `❌ ${report.numFailedTests} failed`
    : "✅ all passed";
}

function runDuration(report) {
  const times = (report.testResults ?? [])
    .flatMap((t) => [t.startTime, t.endTime])
    .filter((n) => typeof n === "number" && n > 0);
  return times.length ? Math.round(Math.max(...times) - Math.min(...times)) : 0;
}

function summaryLines(data) {
  const report = data.report;
  const relative = path.relative(REPO_ROOT, data.cwd) || ".";
  return [
    "## Summary",
    `- Working directory: \`${relative}\``,
    `- Test files: ${report.numTotalTestSuites} total, ${report.numPassedTestSuites} passed, ${report.numFailedTestSuites} failed`,
    `- Tests: ${report.numTotalTests} total, ${report.numPassedTests} passed, ${report.numFailedTests} failed, ${report.numPendingTests} skipped, ${report.numTodoTests} todo`,
    `- Status: ${statusLine(report)}`,
    `- Duration: ${runDuration(report)}ms`,
    "",
  ];
}

function firstLine(message) {
  const line = String(message).split("\n").find((l) => l.trim().length > 0) ?? "";
  const trimmed = line.trim();
  return trimmed.length > 300 ? `${trimmed.slice(0, 300)}…` : trimmed;
}

function failureLines(report, cap = 50) {
  const lines = [];
  const failedFiles = (report.testResults ?? []).filter((t) => t.status === "failed");
  if (!failedFiles.length) return lines;
  lines.push("## Failures\n");
  let shown = 0;
  for (const file of failedFiles) {
    lines.push(`### ${path.relative(REPO_ROOT, file.name)}`);
    const failedAsserts = (file.assertionResults ?? []).filter((a) => a.status === "failed");
    if (!failedAsserts.length) {
      lines.push(file.message ? firstLine(file.message) : "(suite failed without assertion details)");
      lines.push("");
      continue;
    }
    for (const assertion of failedAsserts) {
      if (shown >= cap) break;
      lines.push(`- ${assertion.fullName || assertion.title}`);
      const message = (assertion.failureMessages ?? [])[0];
      if (message) lines.push(`  ${firstLine(message)}`);
      shown += 1;
    }
    lines.push("");
    if (shown >= cap) {
      lines.push(`_… additional failures omitted (showing first ${cap})._`);
      break;
    }
  }
  return lines;
}

function formatRunReport(data) {
  const lines = ["# Vitest Run Report\n", ...summaryLines(data), ...failureLines(data.report)];
  return `${lines.join("\n").trimEnd()}\n`;
}

function formatRelatedReport(data) {
  const lines = [
    "# Vitest Related Tests Report\n",
    "## Source files",
    ...data.files.map((file) => `- \`${file}\``),
    "",
    ...summaryLines(data),
    ...failureLines(data.report),
  ];
  return `${lines.join("\n").trimEnd()}\n`;
}

function formatCoverageReport(data) {
  const lines = ["# Vitest Coverage Report\n", ...summaryLines(data)];
  if (data.coverage) {
    lines.push("## Coverage (total)\n");
    lines.push("| Metric | Covered | Total | % |");
    lines.push("|--------|---------|-------|---|");
    for (const metric of ["lines", "statements", "functions", "branches"]) {
      const entry = data.coverage[metric];
      if (entry) {
        const label = `${metric[0].toUpperCase()}${metric.slice(1)}`;
        lines.push(`| ${label} | ${entry.covered} | ${entry.total} | ${entry.pct}% |`);
      }
    }
    lines.push("");
  } else {
    lines.push("_Coverage summary unavailable — ensure a coverage provider (e.g. @vitest/coverage-v8) is installed in the target workspace._\n");
  }
  lines.push(...failureLines(data.report));
  return `${lines.join("\n").trimEnd()}\n`;
}

function formatListReport(data) {
  const byFile = new Map();
  for (const entry of data.entries) {
    const relative = path.relative(REPO_ROOT, entry.file);
    if (!byFile.has(relative)) byFile.set(relative, []);
    if (!data.filesOnly && entry.name) byFile.get(relative).push(entry.name);
  }
  const lines = ["# Vitest Test List\n", "## Summary"];
  lines.push(`- Working directory: \`${path.relative(REPO_ROOT, data.cwd) || "."}\``);
  lines.push(`- Test files: ${byFile.size}`);
  if (!data.filesOnly) lines.push(`- Test cases: ${data.entries.length}`);
  lines.push("");
  if (!byFile.size) {
    lines.push("_No tests matched._");
    return `${lines.join("\n")}\n`;
  }
  for (const [relative, names] of byFile) {
    lines.push(`### ${relative}`);
    for (const name of names) lines.push(`- ${name}`);
    lines.push("");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

const ACTION_LABEL = {
  "remove-redundant": "Remove redundancy",
  "merge-parameterize": "Merge / parameterize",
};

function formatOverlapReport(data) {
  const relative = path.relative(REPO_ROOT, resolveCwd(data.cwd)) || ".";
  const lines = [
    "# Vitest Overlap Report\n",
    "## Summary",
    `- Working directory: \`${relative}\``,
    `- Test files scanned: ${data.files}`,
    `- Tests analyzed: ${data.tests}`,
    `- Similarity threshold: ${data.threshold}`,
    `- Overlap clusters: ${data.clusters.length}`,
    "",
  ];
  if (!data.clusters.length) {
    lines.push("✅ No overlapping tests above the threshold.");
    return `${lines.join("\n")}\n`;
  }
  lines.push("## Clusters\n");
  const cap = 40;
  data.clusters.slice(0, cap).forEach((cluster, i) => {
    lines.push(`### Cluster ${i + 1} — ${ACTION_LABEL[cluster.recommendation.action]}`);
    lines.push(cluster.recommendation.detail);
    lines.push("");
    lines.push("Members:");
    for (const m of cluster.members) {
      lines.push(`- \`${m.rel}\` — ${m.fullTitle} (${m.assertions} assertion${m.assertions === 1 ? "" : "s"})`);
    }
    lines.push("");
    lines.push("Pairwise similarity (body / title):");
    for (const p of cluster.pairs) lines.push(`- \`${p.a}\` ↔ \`${p.b}\`: ${p.bodySim} / ${p.titleSim}`);
    lines.push("");
  });
  if (data.clusters.length > cap) lines.push(`_… ${data.clusters.length - cap} more clusters omitted._`);
  return `${lines.join("\n").trimEnd()}\n`;
}

const SEVERITY_ICON = { error: "🔴", warn: "🟠", info: "🔵" };

function formatAuditReport(data) {
  const relative = path.relative(REPO_ROOT, resolveCwd(data.cwd)) || ".";
  const lines = [
    "# Vitest Test Audit\n",
    "## Summary",
    `- Working directory: \`${relative}\``,
    `- Test files scanned: ${data.files}`,
    `- Tests analyzed: ${data.tests}`,
    `- Findings: ${data.findings.length} (🔴 ${data.severityCounts.error} error, 🟠 ${data.severityCounts.warn} warn, 🔵 ${data.severityCounts.info} info)`,
    "",
  ];
  if (!data.findings.length) {
    lines.push("✅ No findings — the tests in scope are lean.");
    return `${lines.join("\n")}\n`;
  }
  lines.push("## By rule\n", "| Rule | Count |", "|------|-------|");
  for (const [rule, count] of Object.entries(data.ruleCounts).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${rule} | ${count} |`);
  }
  lines.push("");
  lines.push("## Findings\n");
  const cap = 200;
  for (const f of data.findings.slice(0, cap)) {
    lines.push(`- ${SEVERITY_ICON[f.severity]} **${f.rule}** \`${f.location}\` — ${f.message}`);
    lines.push(`  - ${f.test}`);
    lines.push(`  - Fix: ${f.fix}`);
  }
  if (data.findings.length > cap) lines.push(`\n_… ${data.findings.length - cap} more findings omitted._`);
  return `${lines.join("\n").trimEnd()}\n`;
}

// Tool definitions

const CWD_PROPERTY = {
  type: "string",
  description:
    "Workspace directory (relative to the repo root) whose vitest config should run. Must be a package with a vitest config and a local vitest install. Defaults to the repo root.",
  default: ".",
};

const FILTERS_PROPERTY = {
  type: "array",
  items: { type: "string" },
  description: 'Filename substrings matched against test file paths to narrow the selection (e.g. ["button", "menu"]). Omit to include all test files.',
};

const TEST_NAME_PATTERN_PROPERTY = {
  type: "string",
  description: "Only run tests whose full name matches this regexp (vitest -t).",
};

const TOOLS = [
  {
    name: "run_tests",
    description:
      "Run a vitest suite once and report pass/fail/skip counts plus details for any failing tests.",
    inputSchema: {
      type: "object",
      properties: {
        cwd: CWD_PROPERTY,
        filters: FILTERS_PROPERTY,
        testNamePattern: TEST_NAME_PATTERN_PROPERTY,
        changed: {
          type: "boolean",
          description: "Only run tests affected by files changed since the last commit (vitest --changed). Default: false.",
          default: false,
        },
      },
      required: [],
    },
  },
  {
    name: "list_tests",
    description:
      "Collect and list tests without executing them (vitest list). Returns test files and, unless filesOnly is set, individual test names.",
    inputSchema: {
      type: "object",
      properties: {
        cwd: CWD_PROPERTY,
        filters: FILTERS_PROPERTY,
        filesOnly: {
          type: "boolean",
          description: "List only test files, omitting individual test cases (vitest --filesOnly). Default: false.",
          default: false,
        },
      },
      required: [],
    },
  },
  {
    name: "run_coverage",
    description:
      "Run the suite with coverage enabled and report line/statement/function/branch totals alongside the pass/fail summary. Requires a coverage provider (e.g. @vitest/coverage-v8) in the target workspace.",
    inputSchema: {
      type: "object",
      properties: {
        cwd: CWD_PROPERTY,
        filters: FILTERS_PROPERTY,
        testNamePattern: TEST_NAME_PATTERN_PROPERTY,
      },
      required: [],
    },
  },
  {
    name: "run_related",
    description:
      "Run only the test files related to the given source files (vitest related). Useful for checking which tests exercise a changed module.",
    inputSchema: {
      type: "object",
      properties: {
        cwd: CWD_PROPERTY,
        files: {
          type: "array",
          items: { type: "string" },
          minItems: 1,
          description: "Source file paths (relative to cwd or the repo root) whose dependent tests should run.",
        },
        testNamePattern: TEST_NAME_PATTERN_PROPERTY,
      },
      required: ["files"],
    },
  },
  {
    name: "find_overlaps",
    description:
      "Statically scan test files in scope and cluster tests that overlap — same assertions over the same exercised APIs, or strongly similar titles and bodies. Each cluster reports its members (file:line), pairwise body/title similarity, and a recommendation: drop the redundant test when one is a subset of another, or merge siblings into a single it.each when they assert the same thing over differing inputs. Does not run vitest and does not edit files; it surfaces the candidates to consolidate.",
    inputSchema: {
      type: "object",
      properties: {
        cwd: CWD_PROPERTY,
        filters: FILTERS_PROPERTY,
        threshold: {
          type: "number",
          description: "Minimum body (assertion + exercised-API) similarity, 0–1, for two tests to be linked. Lower to surface looser overlaps. Default: 0.7.",
          default: 0.7,
        },
      },
      required: [],
    },
  },
  {
    name: "audit_tests",
    description:
      "Statically audit test files in scope for best-practice and leanness issues — the test-suite analogue of the code-quality server. Flags left-on `.only`, skipped/todo tests, assertion-free tests, weak truthiness-only assertions, control flow in test bodies, leftover console calls, real-timer waits, vague titles, oversized inline snapshots, overloaded tests, long bodies, and setup duplicated across siblings that belongs in a beforeEach. Returns findings keyed rule → file:line with a severity and a one-line fix. Does not run vitest and does not edit files.",
    inputSchema: {
      type: "object",
      properties: {
        cwd: CWD_PROPERTY,
        filters: FILTERS_PROPERTY,
        rules: {
          type: "array",
          items: { type: "string" },
          description: `Restrict to these rule ids. Omit for all. Available: ${RULE_IDS_FOR_SCHEMA.join(", ")}.`,
        },
        minSeverity: {
          type: "string",
          enum: ["error", "warn", "info"],
          default: "info",
          description: "Only report findings at or above this severity. Default: info (all).",
        },
      },
      required: [],
    },
  },
];

const TOOLS_BY_NAME = new Map(TOOLS.map((tool) => [tool.name, tool]));

// Server

const server = new Server(
  {
    name: "vitest",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  function validationError(toolName, issues) {
    const detail = issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return {
      content: [{ type: "text", text: `Invalid arguments for ${toolName}: ${detail}` }],
      isError: true,
    };
  }
  const tool = TOOLS_BY_NAME.get(name);
  try {
    switch (name) {
      case "run_tests": {
        const parsed = parseArgs(tool.inputSchema, args);
        if (!parsed.success) return validationError(name, parsed.issues);
        const result = await runTests(parsed.data);
        return { content: [{ type: "text", text: formatRunReport(result) }] };
      }
      case "list_tests": {
        const parsed = parseArgs(tool.inputSchema, args);
        if (!parsed.success) return validationError(name, parsed.issues);
        const result = await listTests(parsed.data);
        return { content: [{ type: "text", text: formatListReport(result) }] };
      }
      case "run_coverage": {
        const parsed = parseArgs(tool.inputSchema, args);
        if (!parsed.success) return validationError(name, parsed.issues);
        const result = await runCoverage(parsed.data);
        return { content: [{ type: "text", text: formatCoverageReport(result) }] };
      }
      case "run_related": {
        const parsed = parseArgs(tool.inputSchema, args);
        if (!parsed.success) return validationError(name, parsed.issues);
        const result = await runRelated(parsed.data);
        return { content: [{ type: "text", text: formatRelatedReport(result) }] };
      }
      case "find_overlaps": {
        const parsed = parseArgs(tool.inputSchema, args);
        if (!parsed.success) return validationError(name, parsed.issues);
        const result = await testAnalysis.findOverlaps(parsed.data);
        return { content: [{ type: "text", text: formatOverlapReport({ ...result, cwd: parsed.data.cwd }) }] };
      }
      case "audit_tests": {
        const parsed = parseArgs(tool.inputSchema, args);
        if (!parsed.success) return validationError(name, parsed.issues);
        const result = await testAnalysis.auditTests(parsed.data);
        return { content: [{ type: "text", text: formatAuditReport({ ...result, cwd: parsed.data.cwd }) }] };
      }
      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Vitest MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
