// Drives the repo's own gates so a cadence_implement edit is proven, not trusted:
// Biome (lint + format), tsc (types), and vitest related (tests that import the
// changed file). withRollback snapshots the files first and restores them if the
// gate fails, so a transform that breaks behaviour never lands.

import { spawn } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

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

const tail = (s, n = 30) =>
	s
		.split('\n')
		.filter((l) => l.trim())
		.slice(-n)
		.join('\n')

// Run --write so the codemod output picks up Biome's formatting before the gate.
export function formatFiles(repoRoot, absFiles) {
	return run('pnpm', ['exec', 'biome', 'check', '--write', ...absFiles], { cwd: repoRoot })
}

export async function verifyChange(repoRoot, absFiles, { lint = true, types = true, tests = true } = {}) {
	const uiDir = join(repoRoot, 'packages', 'ui')
	const steps = []

	if (lint) {
		const r = await run('pnpm', ['exec', 'biome', 'check', ...absFiles], { cwd: repoRoot })
		steps.push({ name: 'biome', ok: r.code === 0, detail: r.code === 0 ? 'clean' : tail(r.stdout + r.stderr) })
	}
	if (types) {
		const r = await run('pnpm', ['--filter', 'ui', 'exec', 'tsc', '--noEmit'], { cwd: repoRoot })
		steps.push({ name: 'tsc --noEmit', ok: r.code === 0, detail: r.code === 0 ? 'clean' : tail(r.stdout + r.stderr) })
	}
	if (tests) {
		const rel = absFiles.map((f) => relative(uiDir, f))
		const r = await run('pnpm', ['--filter', 'ui', 'exec', 'vitest', 'related', '--run', ...rel], {
			cwd: repoRoot,
			env: { ...process.env, CI: '1' },
		})
		steps.push({ name: 'vitest related', ok: r.code === 0, detail: r.code === 0 ? 'passed' : tail(r.stdout + r.stderr) })
	}

	return { ok: steps.every((s) => s.ok), steps }
}

export async function withRollback(absFiles, mutate, verify) {
	const snapshot = new Map()
	for (const f of absFiles) snapshot.set(f, await readFile(f, 'utf8'))
	await mutate()
	const result = await verify()
	if (!result.ok) {
		for (const [f, text] of snapshot) await writeFile(f, text, 'utf8')
		return { ...result, rolledBack: true }
	}
	return { ...result, rolledBack: false }
}
