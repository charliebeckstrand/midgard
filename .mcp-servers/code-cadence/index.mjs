#!/usr/bin/env node
// Code Cadence MCP server.
//
// Sibling of code-quality: code-quality finds defects (speed, stability,
// correctness); cadence takes code that is technically fine but over-granular or
// non-idiomatic and moves it toward the simplest idiomatic form that preserves
// behaviour. v1 covers React 19 only. Three tools:
//   cadence_review     find findings over named paths or a sweep (non-mutating)
//   cadence_diagnose   explain why an escalation finding doesn't drop in cleanly
//   cadence_implement  apply a mechanical codemod, then prove it via the gates
//
// The server loads on a fresh clone (Node only); analysis and the verify gate
// need the workspace installed.

import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { applyRuleToSource, diagnoseFile, reviewPaths } from './analysis.mjs'
import { RULE_IDS_FOR_SCHEMA, RULES, getRule } from './rules.mjs'
import { formatFiles, verifyChange, withRollback } from './verify.mjs'

// Newline-delimited JSON-RPC 2.0 over stdio.
const PROTOCOL_VERSION = '2025-06-18'
const ListToolsRequestSchema = { method: 'tools/list' }
const CallToolRequestSchema = { method: 'tools/call' }

class StdioServerTransport {
	start(onMessage) {
		let buffer = ''
		process.stdin.on('data', (chunk) => {
			buffer += chunk.toString('utf8')
			let newline = buffer.indexOf('\n')
			while (newline !== -1) {
				const line = buffer.slice(0, newline).trim()
				buffer = buffer.slice(newline + 1)
				if (line) onMessage(line)
				newline = buffer.indexOf('\n')
			}
		})
		process.stdin.on('end', () => process.exit(0))
	}

	send(message) {
		process.stdout.write(`${JSON.stringify(message)}\n`)
	}
}

class Server {
	constructor(serverInfo, options) {
		this.serverInfo = serverInfo
		this.options = options ?? {}
		this.handlers = new Map()
	}

	setRequestHandler(schema, handler) {
		this.handlers.set(schema.method, handler)
	}

	async connect(transport) {
		this.transport = transport
		transport.start((line) => this.receive(line))
	}

	async receive(line) {
		let message
		try {
			message = JSON.parse(line)
		} catch {
			this.transport.send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } })
			return
		}
		const { id, method, params } = message
		if (id === undefined || id === null) return
		if (method === 'initialize') {
			this.transport.send({
				jsonrpc: '2.0',
				id,
				result: {
					protocolVersion: params?.protocolVersion ?? PROTOCOL_VERSION,
					capabilities: this.options.capabilities ?? { tools: {} },
					serverInfo: this.serverInfo,
				},
			})
			return
		}
		if (method === 'ping') {
			this.transport.send({ jsonrpc: '2.0', id, result: {} })
			return
		}
		const handler = this.handlers.get(method)
		if (!handler) {
			this.transport.send({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } })
			return
		}
		try {
			const result = await handler({ params })
			this.transport.send({ jsonrpc: '2.0', id, result })
		} catch (error) {
			const text = error instanceof Error ? error.message : String(error)
			this.transport.send({ jsonrpc: '2.0', id, error: { code: -32603, message: text } })
		}
	}
}

// Validate raw args against a tool's JSON Schema: defaults, type/enum/required,
// and array item types.
function parseArgs(schema, rawArgs) {
	const args = rawArgs && typeof rawArgs === 'object' ? rawArgs : {}
	const issues = []
	const data = {}
	const properties = schema.properties ?? {}
	for (const key of schema.required ?? []) {
		if (args[key] === undefined || args[key] === null) issues.push({ path: [key], message: 'is required' })
	}
	for (const [key, spec] of Object.entries(properties)) {
		const value = args[key]
		if (value === undefined || value === null) {
			if (spec.default !== undefined) data[key] = spec.default
			continue
		}
		if (spec.type === 'array') {
			if (!Array.isArray(value)) {
				issues.push({ path: [key], message: 'must be an array' })
				continue
			}
			if (spec.items?.type && !value.every((v) => typeof v === spec.items.type)) {
				issues.push({ path: [key], message: `must be an array of ${spec.items.type}` })
				continue
			}
		} else if (spec.type && typeof value !== spec.type) {
			issues.push({ path: [key], message: `must be a ${spec.type}` })
			continue
		}
		if (spec.enum && !spec.enum.includes(value)) {
			issues.push({ path: [key], message: `must be one of: ${spec.enum.join(', ')}` })
			continue
		}
		data[key] = value
	}
	return issues.length ? { success: false, issues } : { success: true, data }
}

// index.mjs → repo root is two levels up.
const REPO_ROOT = process.env.MCP_CADENCE_REPO_ROOT
	? resolve(process.env.MCP_CADENCE_REPO_ROOT)
	: resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

const text = (value) => ({
	content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }],
})

const KIND_ICON = { codemod: '🔧', escalation: '🧭' }
const sourceTag = (s) => `${s.technology} ${s.version} · ${s.anchor}`

function formatReview(scope, scanned, findings) {
	const lines = ['# Code Cadence Review', '', '## Summary', `- Scope: ${scope}`, `- Files scanned: ${scanned}`]
	const codemods = findings.filter((f) => f.kind === 'codemod').length
	const escalations = findings.length - codemods
	lines.push(`- Findings: ${findings.length} (🔧 ${codemods} codemod, 🧭 ${escalations} escalation)`, '')
	if (findings.length === 0) {
		lines.push('✅ No cadence findings — already idiomatic for the active rules.')
		return `${lines.join('\n')}\n`
	}
	lines.push('## Findings', '')
	for (const f of findings) {
		lines.push(`- ${KIND_ICON[f.kind] ?? ''} **${f.ruleId}** \`${f.file}:${f.line}\` — ${f.message}`)
		lines.push(`  - idiom: ${f.rationale} _[${sourceTag(f.source)}]_`)
		lines.push(f.kind === 'codemod' ? `  - fix: ${f.fix} (cadence_implement)` : '  - escalation: run cadence_diagnose for the redesign questions')
	}
	return `${lines.join('\n')}\n`
}

async function cadenceReview({ paths, changed, rules, minSeverity }) {
	const sweep = !paths?.length && !changed ? true : changed
	const { scanned, findings } = await reviewPaths(REPO_ROOT, { paths, changed: sweep, rules, minSeverity })
	const scope = paths?.length ? paths.join(', ') : 'git-changed'
	return text(formatReview(scope, scanned, findings))
}

async function cadenceDiagnose({ path, ruleId }) {
	const result = await diagnoseFile(REPO_ROOT, path, ruleId)
	const lines = [`# Code Cadence Diagnosis — \`${path}\``, '']
	const reports = result.reports ?? [{ ruleId: result.ruleId, report: result.report }]
	if (reports.every((r) => !r.report || r.report.startsWith('No '))) {
		lines.push('No escalation findings in this file.')
		return text(`${lines.join('\n')}\n`)
	}
	for (const r of reports) {
		lines.push(`## ${r.ruleId}`, '', r.report, '')
	}
	return text(`${lines.join('\n')}\n`)
}

function codemodRulesFor(ruleId) {
	if (ruleId) {
		const rule = getRule(ruleId)
		if (!rule) throw new Error(`Unknown rule: ${ruleId}`)
		if (rule.kind !== 'codemod') throw new Error(`Rule ${ruleId} is an escalation rule — use cadence_diagnose.`)
		return [rule]
	}
	return RULES.filter((r) => r.kind === 'codemod')
}

async function cadenceImplement({ path, ruleId, verify }) {
	const abs = join(REPO_ROOT, path)
	const rel = relative(REPO_ROOT, abs)
	const targets = codemodRulesFor(ruleId)

	// Apply the codemods in memory over the running text, then write once.
	let working = await readFile(abs, 'utf8')
	const applied = []
	for (const rule of targets) {
		const { after, changes } = await applyRuleToSource(REPO_ROOT, rel, working, rule.id)
		if (changes > 0) {
			working = after
			applied.push({ ruleId: rule.id, changes })
		}
	}

	const lines = [`# Code Cadence Implement — \`${rel}\``, '']
	if (applied.length === 0) {
		lines.push('Nothing to do — no mechanical codemod matched.')
		return text(`${lines.join('\n')}\n`)
	}

	if (verify === false) {
		await writeFile(abs, working, 'utf8')
		await formatFiles(REPO_ROOT, [abs])
		lines.push('Applied (unverified — `verify: false`):')
		for (const a of applied) lines.push(`- ${a.ruleId}: ${a.changes} change(s)`)
		lines.push('', '⚠️ Gate skipped. Run `biome check`, `tsc`, and the related tests before committing.')
		return text(`${lines.join('\n')}\n`)
	}

	const result = await withRollback(
		[abs],
		async () => {
			await writeFile(abs, working, 'utf8')
			await formatFiles(REPO_ROOT, [abs])
		},
		() => verifyChange(REPO_ROOT, [abs]),
	)

	lines.push(result.rolledBack ? '❌ Rolled back — the gate failed; the file is unchanged.' : '✅ Applied and verified.')
	lines.push('', '## Codemods')
	for (const a of applied) lines.push(`- ${a.ruleId}: ${a.changes} change(s)`)
	lines.push('', '## Gate')
	for (const s of result.steps) lines.push(`- ${s.ok ? '✅' : '❌'} ${s.name}${s.ok ? '' : `\n\n\`\`\`\n${s.detail}\n\`\`\``}`)
	return text(`${lines.join('\n')}\n`)
}

const TOOLS = [
	{
		name: 'cadence_review',
		description:
			'Find code that is technically fine but over-granular or non-idiomatic for React 19, and report each finding without changing anything. Pass `paths` (files or dirs, relative to repo root) for named targets, or omit them to sweep git-changed files. Each finding carries the idiom, a doc citation, and whether it is a mechanical codemod (run cadence_implement) or an escalation (run cadence_diagnose). v1 covers React 19 only.',
		inputSchema: {
			type: 'object',
			properties: {
				paths: {
					type: 'array',
					items: { type: 'string' },
					description: 'Files or directories (relative to repo root). Omit to sweep git-changed files.',
				},
				changed: { type: 'boolean', default: false, description: 'Force the git-changed sweep even when paths are given.' },
				rules: { type: 'array', items: { type: 'string' }, description: `Restrict to specific rule ids. Available: ${RULE_IDS_FOR_SCHEMA.join(', ')}.` },
				minSeverity: { type: 'string', enum: ['error', 'warn', 'info'], description: 'Only report findings at or above this severity.' },
			},
			required: [],
		},
		run: cadenceReview,
	},
	{
		name: 'cadence_diagnose',
		description:
			'Explain why an escalation finding (e.g. fetch-in-useEffect → use()) does not drop in mechanically and what restructuring would make the idiom viable — breaking a component up, lifting a fetch, adding a Suspense/error boundary. Does not change code; it produces the questions and the proposed redesign. Pass a single `path`; optionally a `ruleId` to focus one rule.',
		inputSchema: {
			type: 'object',
			properties: {
				path: { type: 'string', description: 'A single file, relative to repo root.' },
				ruleId: { type: 'string', description: `Focus one rule. Available escalation rules: ${RULES.filter((r) => r.kind === 'escalation').map((r) => r.id).join(', ')}.` },
			},
			required: ['path'],
		},
		run: cadenceDiagnose,
	},
	{
		name: 'cadence_implement',
		description:
			'Apply the mechanical (behaviour-preserving) codemods to a file, then prove the change by running Biome, tsc, and the related vitest suite; if the gate fails the edit is rolled back so nothing broken lands. Pass a single `path`; optionally a `ruleId` to apply just one codemod (default: all that match). Escalation rules are refused here — diagnose them instead. Runs real gates and can take tens of seconds.',
		inputSchema: {
			type: 'object',
			properties: {
				path: { type: 'string', description: 'A single file, relative to repo root.' },
				ruleId: { type: 'string', description: `Apply only this codemod. Available: ${RULES.filter((r) => r.kind === 'codemod').map((r) => r.id).join(', ')}.` },
				verify: { type: 'boolean', default: true, description: 'Run the gate after applying (default true). Set false to apply without verifying.' },
			},
			required: ['path'],
		},
		run: cadenceImplement,
	},
]

const TOOLS_BY_NAME = new Map(TOOLS.map((tool) => [tool.name, tool]))

const server = new Server({ name: 'code-cadence', version: '0.1.0' }, { capabilities: { tools: {} } })

server.setRequestHandler(ListToolsRequestSchema, async () => ({
	tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args } = request.params
	const tool = TOOLS_BY_NAME.get(name)
	if (!tool) return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true }
	const parsed = parseArgs(tool.inputSchema, args)
	if (!parsed.success) {
		const detail = parsed.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
		return { content: [{ type: 'text', text: `Invalid arguments for ${name}: ${detail}` }], isError: true }
	}
	try {
		return await tool.run(parsed.data)
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true }
	}
})

async function main() {
	await server.connect(new StdioServerTransport())
	console.error('code-cadence MCP server running on stdio')
}

main().catch((error) => {
	console.error('Fatal error:', error)
	process.exit(1)
})
