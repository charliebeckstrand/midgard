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
})
