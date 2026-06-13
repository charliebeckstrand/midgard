#!/usr/bin/env node
// a11y MCP server for packages/ui.
//
// First-party, zero-dependency: a minimal inline MCP stdio runtime stands in
// for the SDK (modelled on .mcp-servers/vitest/index.mjs), so this runs on a
// fresh clone with nothing but Node — no node_modules, no install step. Three
// tools over the accessibility corpus (`src/__tests__/a11y/cases/*`):
//   corpus_coverage  which components have a canonical case, in which gate
//   which_gate       where a component's a11y is asserted + where new ones go
//   audit            run the existing axe gate and return structured findings
//
// Static tools read the corpus by import scan (analysis.mjs); audit drives the
// existing vitest gates (audit.mjs). Launched over stdio from the repo root via
// `.mcp.json` (`node .mcp-servers/a11y/index.mjs`).

import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createAnalysis } from './analysis.mjs'
import { auditGeometry, auditStructural } from './audit.mjs'

// --- Minimal MCP stdio runtime -------------------------------------------------
// Newline-delimited JSON-RPC 2.0 over stdio. The surface matches the SDK (and
// the vitest server's runtime) so the handlers below read the same way.

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
		// Notifications carry no id and expect no response.
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

// Derives a zod-style safeParse from each tool's JSON Schema, applying defaults
// and validating type/enum/required, so dispatch reads like the vitest server.
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
		if (spec.type && typeof value !== spec.type) {
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

// --- Analysis ------------------------------------------------------------------

// .mcp-servers/a11y/index.mjs → repo root.
const REPO_ROOT = process.env.MCP_A11Y_REPO_ROOT
	? resolve(process.env.MCP_A11Y_REPO_ROOT)
	: resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

const analysis = createAnalysis(REPO_ROOT)

const text = (value) => ({
	content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }],
})

function corpusCoverage({ component }) {
	if (component) {
		if (!analysis.listComponents().includes(component)) {
			return text(`Unknown component "${component}". It must be a dir under packages/ui/src/components.`)
		}
		return text(analysis.coverageFor(component))
	}
	const cov = analysis.coverage()
	return text({
		total: cov.total,
		covered: cov.covered,
		gaps: cov.gaps,
		byComponent: Object.fromEntries(cov.rows.map((r) => [r.component, { buckets: r.buckets, gates: r.gates }])),
	})
}

function whichGate({ component }) {
	if (!analysis.listComponents().includes(component)) {
		return text(`Unknown component "${component}". It must be a dir under packages/ui/src/components.`)
	}
	const { buckets, gates } = analysis.coverageFor(component)
	const uncovered = Object.entries(analysis.GATES)
		.filter(([id]) => !gates.includes(id))
		.map(([id, g]) => ({ id, label: g.label, file: g.file, addVia: `add a case to the ${g.buckets.join('/')} corpus` }))
	return text({
		component,
		inCorpusBuckets: buckets,
		assertedBy: gates.map((id) => {
			const g = analysis.GATES[id]
			return { gate: id, label: g.label, env: g.env, rules: g.rules, wcag: g.wcag, file: g.file }
		}),
		notAssertedBy: uncovered,
		routing: {
			domTree: 'roles/attributes/events/focus order → jsdom corpus (structural, focus)',
			layoutAndColour: 'contrast/target-size/geometry/traps → browser suite (geometry, traps)',
			placement: 'kind-wide guarantee → shared a11y/cases corpus; one-off behaviour → its own test file',
		},
		landmarks: analysis.LANDMARK_GATE,
	})
}

async function audit({ gate, bucket, nameFilter }) {
	const result =
		gate === 'geometry'
			? await auditGeometry(REPO_ROOT, { filter: nameFilter ?? '' })
			: await auditStructural(REPO_ROOT, { bucket, filter: nameFilter ?? '' })
	return text(result)
}

// --- Tool definitions ----------------------------------------------------------

const TOOLS = [
	{
		name: 'corpus_coverage',
		description:
			'Map packages/ui components to the accessibility corpus: which have a canonical case, in which gate (structural/geometry/focus/traps), and which have none. Pass a component for one row; omit it for the full map plus the gap list. Coverage is import-level — a component counts as covered when a gate renders it, including as a wrapper or trigger.',
		inputSchema: {
			type: 'object',
			properties: {
				component: { type: 'string', description: 'A component dir name, e.g. "dialog". Omit for all.' },
			},
			required: [],
		},
		run: corpusCoverage,
	},
	{
		name: 'which_gate',
		description:
			'For a component, report which a11y gates assert it today and where a new assertion belongs. Per CONVENTIONS §10.5: DOM-tree assertions (roles, attributes, focus order) run under jsdom; layout/colour/geometry (contrast, target size, traps) run in the browser suite. A guarantee that must hold for every component of a kind goes in the shared corpus; behaviour specific to one component goes in its own test file.',
		inputSchema: {
			type: 'object',
			properties: {
				component: { type: 'string', description: 'A component dir name, e.g. "menu".' },
			},
			required: ['component'],
		},
		run: whichGate,
	},
	{
		name: 'audit',
		description:
			'Run the existing vitest a11y gate and return structured findings. gate="structural" (default) runs jsdom axe over a corpus bucket and returns per-case violations keyed to data-slot + WCAG SC. gate="geometry" runs the browser contrast/target-size gate (requires Playwright browsers). This executes real tests and may take tens of seconds.',
		inputSchema: {
			type: 'object',
			properties: {
				gate: { type: 'string', enum: ['structural', 'geometry'], default: 'structural', description: 'Which gate to run.' },
				bucket: {
					type: 'string',
					enum: ['baseline', 'overlays', 'interactive'],
					default: 'baseline',
					description: 'Corpus bucket for the structural gate.',
				},
				nameFilter: { type: 'string', description: 'Case-name substring, e.g. "dialog" or "button".' },
			},
			required: [],
		},
		run: audit,
	},
]

const TOOLS_BY_NAME = new Map(TOOLS.map((tool) => [tool.name, tool]))

// --- Server --------------------------------------------------------------------

const server = new Server({ name: 'a11y', version: '0.1.0' }, { capabilities: { tools: {} } })

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
	console.error('a11y MCP server running on stdio')
}

main().catch((error) => {
	console.error('Fatal error:', error)
	process.exit(1)
})
