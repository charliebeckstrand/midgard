import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createApiExtractor } from '../../api-reference'

/**
 * Lay down a throwaway package the extractor can open: a `tsconfig.json` one
 * level above `src` (what {@link openProject} resolves) and two component
 * barrels. `barDependsOnFoo` routes a type Bar documents through Foo's
 * directory, so an edit to Foo must re-extract Bar even though no directory
 * ownership links them.
 */
function writeFixture(root: string, { barDependsOnFoo = false } = {}): string {
	const src = path.join(root, 'src')

	const write = (rel: string, text: string) => {
		const full = path.join(src, rel)

		fs.mkdirSync(path.dirname(full), { recursive: true })

		fs.writeFileSync(full, text)
	}

	fs.writeFileSync(
		path.join(root, 'tsconfig.json'),
		JSON.stringify({
			compilerOptions: {
				strict: true,
				jsx: 'react-jsx',
				module: 'ESNext',
				moduleResolution: 'Bundler',
				lib: ['ES2022'],
			},
		}),
	)

	write('components/foo/index.ts', `export { Foo } from './foo'\n`)

	write(
		'components/foo/foo.tsx',
		[
			`/** A foo. */`,
			`export function Foo(props: { label?: string }) {`,
			`\treturn props.label ?? null`,
			`}`,
			'',
		].join('\n'),
	)

	if (barDependsOnFoo) {
		write('components/foo/shared.ts', `export type Tone = 'a' | 'b'\n`)

		write('components/bar/index.ts', `export { Bar } from './bar'\n`)

		write(
			'components/bar/bar.tsx',
			[
				`import type { Tone } from '../foo/shared'`,
				`/** A bar. */`,
				`export function Bar(props: { tone?: Tone }) {`,
				`\treturn props.tone ?? null`,
				`}`,
				'',
			].join('\n'),
		)
	} else {
		write('components/bar/index.ts', `export { Bar } from './bar'\n`)

		write(
			'components/bar/bar.tsx',
			[
				`/** A bar. */`,
				`export function Bar(props: { count?: number }) {`,
				`\treturn null`,
				`}`,
				'',
			].join('\n'),
		)
	}

	return src
}

/** Retype Foo's prop on disk, so the file's content hash moves. */
function editFoo(srcDir: string, propType: string): void {
	fs.writeFileSync(
		path.join(srcDir, 'components', 'foo', 'foo.tsx'),
		[
			`/** A foo. */`,
			`export function Foo(props: { label?: ${propType} }) {`,
			`\treturn null`,
			`}`,
			'',
		].join('\n'),
	)
}

/** The hash a persisted cache carries — the key `aggregateHash` produced for it. */
function cacheKey(cacheDir: string): string {
	const raw = fs.readFileSync(path.join(cacheDir, 'api.json'), 'utf-8')

	return (JSON.parse(raw) as { hash: string }).hash
}

const roots: string[] = []

function fixture(opts?: { barDependsOnFoo?: boolean }): { srcDir: string; cacheDir: string } {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'api-extractor-'))

	roots.push(root)

	return { srcDir: writeFixture(root, opts), cacheDir: path.join(root, '.cache') }
}

afterEach(() => {
	for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true })
})

describe('createApiExtractor', () => {
	it('extracts every documentable barrel keyed by directory name', () => {
		const { srcDir } = fixture()

		const result = createApiExtractor(srcDir, { cacheDir: null }).getAll()

		expect(Object.keys(result).sort()).toEqual(['bar', 'foo'])

		expect(result.foo).toEqual([
			{ name: 'Foo', description: 'A foo.', props: [{ name: 'label', type: 'string' }] },
		])

		expect(result.bar?.[0]?.props).toEqual([{ name: 'count', type: 'number' }])
	})

	it('ignores non-source, docs, and test files', () => {
		const { srcDir } = fixture()

		const extractor = createApiExtractor(srcDir, { cacheDir: null })

		extractor.getAll()

		expect(extractor.notifyChanged(path.join(srcDir, 'README.md'))).toBe(false)

		expect(extractor.notifyChanged(path.join(srcDir, 'docs', 'demos', 'x.tsx'))).toBe(false)

		expect(extractor.notifyChanged(path.join(srcDir, 'components', 'foo', 'foo.test.tsx'))).toBe(
			false,
		)

		expect(extractor.notifyChanged(path.join(srcDir, 'components', 'foo', 'foo.tsx'))).toBe(true)
	})

	it('re-extracts only the barrels a changed file feeds', () => {
		const { srcDir } = fixture()

		const extractor = createApiExtractor(srcDir, { cacheDir: null })

		const first = extractor.getAll()

		extractor.notifyChanged(path.join(srcDir, 'components', 'foo', 'foo.tsx'))

		const second = extractor.getAll()

		// Foo re-extracts (new array); Bar, which never reaches Foo, is untouched.
		expect(second.foo).not.toBe(first.foo)

		expect(second.bar).toBe(first.bar)
	})

	it('reads fresh source for an in-session edit to an already-warmed barrel', () => {
		const { srcDir } = fixture()

		const fooPath = path.join(srcDir, 'components', 'foo', 'foo.tsx')

		const extractor = createApiExtractor(srcDir, { cacheDir: null })

		extractor.getAll()

		// Retype Foo's prop on disk. The live project still holds the pre-edit AST,
		// so the refresh must apply synchronously before the next extraction reads it.
		editFoo(srcDir, 'number')

		extractor.notifyChanged(fooPath)

		expect(extractor.getAll().foo?.[0]?.props).toEqual([{ name: 'label', type: 'number' }])
	})

	it('surfaces a component barrel added after the initial load', () => {
		const { srcDir } = fixture()

		const extractor = createApiExtractor(srcDir, { cacheDir: null })

		expect(Object.keys(extractor.getAll()).sort()).toEqual(['bar', 'foo'])

		// Scaffold a new barrel mid-session; `barrels` must re-list so it isn't
		// stranded until a restart.
		const bazDir = path.join(srcDir, 'components', 'baz')

		fs.mkdirSync(bazDir, { recursive: true })

		fs.writeFileSync(path.join(bazDir, 'index.ts'), `export { Baz } from './baz'\n`)

		fs.writeFileSync(
			path.join(bazDir, 'baz.tsx'),
			[
				`/** A baz. */`,
				`export function Baz(props: { open?: boolean }) {`,
				`\treturn null`,
				`}`,
				'',
			].join('\n'),
		)

		extractor.notifyChanged(path.join(bazDir, 'index.ts'))

		expect(Object.keys(extractor.getAll()).sort()).toEqual(['bar', 'baz', 'foo'])
	})

	it('re-extracts a barrel when a cross-directory dependency it reads changes', () => {
		const { srcDir } = fixture({ barDependsOnFoo: true })

		const extractor = createApiExtractor(srcDir, { cacheDir: null })

		const first = extractor.getAll()

		// Bar documents `Tone`, declared under Foo's directory; editing it must
		// invalidate Bar even though directory ownership wouldn't connect them.
		extractor.notifyChanged(path.join(srcDir, 'components', 'foo', 'shared.ts'))

		const second = extractor.getAll()

		expect(second.bar).not.toBe(first.bar)
	})

	it('replays the disk cache on a fresh extractor when nothing changed', () => {
		const { srcDir, cacheDir } = fixture()

		const first = createApiExtractor(srcDir, { cacheDir }).getAll()

		expect(fs.existsSync(path.join(cacheDir, 'api.json'))).toBe(true)

		const replay = createApiExtractor(srcDir, { cacheDir }).getAll()

		expect(replay).toEqual(first)
	})

	it('invalidates the disk cache when an input file changes on disk', () => {
		const { srcDir, cacheDir } = fixture()

		createApiExtractor(srcDir, { cacheDir }).getAll()

		fs.writeFileSync(
			path.join(srcDir, 'components', 'foo', 'foo.tsx'),
			[
				`/** A foo. */`,
				`export function Foo(props: { label?: string; hidden?: boolean }) {`,
				`\treturn props.label ?? null`,
				`}`,
				'',
			].join('\n'),
		)

		const result = createApiExtractor(srcDir, { cacheDir }).getAll()

		expect(result.foo?.[0]?.props.map((p) => p.name)).toEqual(['label', 'hidden'])
	})

	it('moves the disk cache key when notifyChanged reports a same-session edit', () => {
		const { srcDir, cacheDir } = fixture()

		const extractor = createApiExtractor(srcDir, { cacheDir })

		extractor.getAll()

		const before = cacheKey(cacheDir)

		// The content-hash memo outlives the pass, so a reported path must drop out
		// of it; a retained entry holds the key still forever.
		editFoo(srcDir, 'number')

		extractor.notifyChanged(path.join(srcDir, 'components', 'foo', 'foo.tsx'))

		extractor.getAll()

		expect(cacheKey(cacheDir)).not.toBe(before)
	})

	it('holds the disk cache key when an edit skips notifyChanged, and recovers on the next start', () => {
		const { srcDir, cacheDir } = fixture()

		const extractor = createApiExtractor(srcDir, { cacheDir })

		extractor.getAll()

		const before = cacheKey(cacheDir)

		// Edit Foo behind the extractor's back — a watcher miss, or a write from
		// outside the dev server. Report Bar instead, so a pass runs and persists.
		editFoo(srcDir, 'number')

		extractor.notifyChanged(path.join(srcDir, 'components', 'bar', 'bar.tsx'))

		const second = extractor.getAll()

		// The record misses the edit, because `applyRefreshes` reads reported paths
		// alone. The retained memo holds the key to the tree that record describes,
		// so the pair stays consistent rather than validating a stale record.
		expect(second.foo?.[0]?.props).toEqual([{ name: 'label', type: 'string' }])

		expect(cacheKey(cacheDir)).toBe(before)

		// A fresh extractor starts with an empty memo, so it hashes the real content
		// on disk, the stale key fails, and the missed edit lands.
		const restart = createApiExtractor(srcDir, { cacheDir }).getAll()

		expect(restart.foo?.[0]?.props).toEqual([{ name: 'label', type: 'number' }])
	})
})
