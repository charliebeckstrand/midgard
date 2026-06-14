// Guards the static test analyzers, in particular that they honor the explicit
// (vitest-resolved) file scope the server passes. Run with:
//   node --test .mcp-servers/vitest/analysis.test.mjs
// Lives outside the workspaces, so no vitest config collects it and it never runs
// in the repo's test gate; it is a first-party, Node-built-in check like the server.

import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createTestAnalysis } from './analysis.mjs'

const analysis = createTestAnalysis(process.cwd())

// Writes the given {name: source} files into a throwaway dir and passes their
// absolute paths to fn, then cleans up.
async function withFixtures(files, fn) {
	const dir = await mkdtemp(join(tmpdir(), 'vitest-mcp-analysis-'))
	const paths = {}
	for (const [name, src] of Object.entries(files)) {
		const p = join(dir, name)
		await writeFile(p, src)
		paths[name] = p
	}
	try {
		return await fn(paths, dir)
	} finally {
		await rm(dir, { recursive: true, force: true })
	}
}

test('auditTests restricts analysis to the explicit file scope', async () => {
	await withFixtures(
		{
			'scoped.test.ts': "import { it, expect } from 'vitest'\nit.only('returns one', () => { expect(1).toBe(1) })\n",
			'ignored.test.ts': "import { it, expect } from 'vitest'\nit.only('returns two', () => { expect(2).toBe(2) })\n",
		},
		async (paths) => {
			const res = await analysis.auditTests({ files: [paths['scoped.test.ts']] })
			assert.equal(res.files, 1)
			assert.ok(res.findings.length > 0)
			assert.ok(res.findings.every((f) => f.location.includes('scoped.test.ts')))
			assert.ok(res.findings.some((f) => f.rule === 'focused-test'))
		},
	)
})

test('auditTests flags an assertion-free test', async () => {
	await withFixtures(
		{ 'smoke.test.ts': "import { it } from 'vitest'\nit('mounts the widget', () => { mountWidget() })\n" },
		async (paths) => {
			const res = await analysis.auditTests({ files: [paths['smoke.test.ts']] })
			assert.ok(res.findings.some((f) => f.rule === 'no-assertion'))
		},
	)
})

test('auditTests honors the rules filter', async () => {
	await withFixtures(
		{ 'focused.test.ts': "import { it, expect } from 'vitest'\nit.only('x', () => { expect(1).toBe(1) })\n" },
		async (paths) => {
			const res = await analysis.auditTests({ files: [paths['focused.test.ts']], rules: ['no-assertion'] })
			assert.ok(!res.findings.some((f) => f.rule === 'focused-test'))
		},
	)
})

test('name filters narrow an explicit file list', async () => {
	await withFixtures(
		{
			'keep.test.ts': "import { it, expect } from 'vitest'\nit.only('a', () => { expect(1).toBe(1) })\n",
			'drop.test.ts': "import { it, expect } from 'vitest'\nit.only('b', () => { expect(1).toBe(1) })\n",
		},
		async (paths) => {
			const res = await analysis.auditTests({
				files: [paths['keep.test.ts'], paths['drop.test.ts']],
				filters: ['keep'],
			})
			assert.equal(res.files, 1)
			assert.ok(res.findings.every((f) => f.location.includes('keep.test.ts')))
		},
	)
})

test('findOverlaps clusters duplicate sibling tests within scope', async () => {
	await withFixtures(
		{
			'dup.test.ts':
				"import { describe, it, expect } from 'vitest'\n" +
				"describe('group', () => {\n" +
				'  it(\'case one\', () => { const x = build(); expect(x).toBe(1) })\n' +
				'  it(\'case two\', () => { const x = build(); expect(x).toBe(1) })\n' +
				'})\n',
		},
		async (paths) => {
			const res = await analysis.findOverlaps({ files: [paths['dup.test.ts']], threshold: 0.5 })
			assert.equal(res.files, 1)
			assert.ok(res.clusters.length >= 1)
		},
	)
})

test('walker fallback discovers tests when no explicit scope is given', async () => {
	// No `files` passed → loadTests falls back to the filesystem walk (the path
	// used when vitest can't resolve scope). cwd is absolute, so it resolves to
	// the fixture dir rather than the repo root.
	await withFixtures(
		{ 'walk.test.ts': "import { it, expect } from 'vitest'\nit.only('x', () => { expect(1).toBe(1) })\n" },
		async (_paths, dir) => {
			const res = await analysis.auditTests({ cwd: dir })
			assert.ok(res.files >= 1)
			assert.ok(res.findings.some((f) => f.rule === 'focused-test'))
		},
	)
})
