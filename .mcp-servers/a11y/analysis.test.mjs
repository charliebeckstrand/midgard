// Guards the a11y corpus-map derivation against drift. Run with:
//   node --test .mcp-servers/a11y/analysis.test.mjs
// Lives outside the workspaces, so no vitest config collects it and it never runs
// in the repo's test gate; it is a first-party, Node-built-in check like the server.

import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createAnalysis } from './analysis.mjs'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const CASES_DIR = join(REPO_ROOT, 'packages', 'ui', 'src', '__tests__', 'a11y', 'cases')
const analysis = createAnalysis(REPO_ROOT)

test('bucket set is derived from the corpus barrel (cases/index.ts)', () => {
	assert.deepEqual(Object.keys(analysis.BUCKET_FILES).sort(), [
		'baseline',
		'focus',
		'interactive',
		'overlays',
		'traps',
	])
})

test('baseline aggregates every category module imported by cases/baseline.ts', () => {
	const expected = [
		'content.tsx',
		'inputs.tsx',
		'forms.tsx',
		'navigation.tsx',
		'data-display.tsx',
		'data-complex.tsx',
		'layout.tsx',
		'feedback.tsx',
		'specialized.tsx',
	]
	assert.deepEqual([...analysis.BUCKET_FILES.baseline].sort(), [...expected].sort())
})

test('single-file buckets map to their same-named leaf case file', () => {
	assert.deepEqual(analysis.BUCKET_FILES.overlays, ['overlays.tsx'])
	assert.deepEqual(analysis.BUCKET_FILES.interactive, ['interactive.tsx'])
	assert.deepEqual(analysis.BUCKET_FILES.focus, ['focus.tsx'])
	assert.deepEqual(analysis.BUCKET_FILES.traps, ['traps.tsx'])
})

test('every derived bucket file exists on disk', () => {
	for (const files of Object.values(analysis.BUCKET_FILES)) {
		for (const file of files) {
			assert.ok(existsSync(join(CASES_DIR, file)), `missing case file ${file}`)
		}
	}
})

test('coverage derives from the corpus and every gap is a real component', () => {
	const cov = analysis.coverage()
	assert.ok(cov.total > 0, 'expected components under packages/ui')
	assert.ok(cov.covered > 0, 'expected some components covered by the corpus')
	const components = new Set(analysis.listComponents())
	for (const gap of cov.gaps) {
		assert.ok(components.has(gap), `reported gap ${gap} is not a component`)
	}
})

test('createAnalysis throws when the corpus barrel yields no buckets', async () => {
	const root = await mkdtemp(join(tmpdir(), 'a11y-mcp-barrel-'))
	const cases = join(root, 'packages', 'ui', 'src', '__tests__', 'a11y', 'cases')
	await mkdir(cases, { recursive: true })
	// A barrel the deriver can't read (no `export { x } from './y'` re-exports).
	await writeFile(join(cases, 'index.ts'), "export * from './baseline'\n")
	try {
		assert.throws(() => createAnalysis(root), /no buckets derived/)
	} finally {
		await rm(root, { recursive: true, force: true })
	}
})
