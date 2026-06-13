// Drives the existing vitest a11y gates and returns structured results, rather
// than re-implementing a jsdom+React+axe environment (which would duplicate the
// `__tests__/setup` stubs and drift from the gate). The structural path arms
// `mcp-audit.test.tsx`, which writes raw axe violations to a temp file; the
// geometry path runs the browser contrast/target-size gate (Playwright).

import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

function run(cmd, args, opts) {
	return new Promise((resolve) => {
		const child = spawn(cmd, args, opts)
		let stdout = ''
		let stderr = ''
		child.stdout?.on('data', (d) => {
			stdout += d
		})
		child.stderr?.on('data', (d) => {
			stderr += d
		})
		child.on('error', (err) => resolve({ code: -1, stdout, stderr: String(err) }))
		child.on('close', (code) => resolve({ code, stdout, stderr }))
	})
}

// Structural (jsdom) axe over a corpus bucket, optionally name-filtered.
export async function auditStructural(repoRoot, { bucket = 'baseline', filter = '' }) {
	const dir = mkdtempSync(join(tmpdir(), 'mcp-a11y-'))
	const out = join(dir, 'result.json')
	try {
		const { code, stderr } = await run(
			'pnpm',
			[
				'--filter',
				'ui',
				'exec',
				'vitest',
				'run',
				'src/__tests__/a11y/mcp-audit.test.tsx',
				'--reporter=dot',
			],
			{
				cwd: repoRoot,
				env: {
					...process.env,
					CI: '1', // deterministic reporter, no watch
					MCP_AUDIT: '1',
					MCP_AUDIT_BUCKET: bucket,
					MCP_AUDIT_FILTER: filter,
					MCP_AUDIT_OUT: out,
				},
			},
		)
		let payload
		try {
			payload = JSON.parse(readFileSync(out, 'utf8'))
		} catch {
			return {
				ok: false,
				error: 'No result written — the gate failed to run.',
				stderr: stderr.split('\n').slice(-25).join('\n'),
			}
		}
		const cases = payload.results ?? []
		const withViolations = cases.filter((c) => c.violations.length > 0 || c.error)
		return {
			ok: true,
			gate: 'structural',
			bucket,
			filter,
			testRunExit: code,
			cases: cases.length,
			clean: cases.length - withViolations.length,
			findings: withViolations,
		}
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
}

// Geometry (browser/Chromium) contrast + target-size. Requires Playwright
// browsers; returns the run summary rather than per-node structure (the browser
// pool has no fs to write the corpus result through).
export async function auditGeometry(repoRoot, { filter = '' }) {
	const args = [
		'--filter',
		'ui',
		'exec',
		'vitest',
		'run',
		'--config',
		'vitest.browser.config.ts',
		'--project',
		'browser',
		'src/__tests__/browser/a11y-geometry.test.tsx',
		'--reporter=dot',
	]
	if (filter) args.push('-t', filter)
	const { code, stdout, stderr } = await run('pnpm', args, { cwd: repoRoot, env: { ...process.env, CI: '1' } })
	const tail = (s) => s.split('\n').slice(-40).join('\n')
	const missingBrowser = /Executable doesn't exist|playwright install/i.test(stderr + stdout)
	return {
		ok: code === 0,
		gate: 'geometry',
		filter,
		testRunExit: code,
		note: missingBrowser
			? 'Playwright browsers are not installed. Run: pnpm --filter ui exec playwright install chromium'
			: 'Geometry runs color-contrast + target-size in Chromium; see the summary for failing cases.',
		summary: tail(stdout) || tail(stderr),
	}
}
