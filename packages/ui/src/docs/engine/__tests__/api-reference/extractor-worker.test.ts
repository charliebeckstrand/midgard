// @vitest-environment node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { type ApiExtractorWorker, startApiExtractorWorker } from '../../api-reference'

/** One component whose props signature a case can retype on disk. */
function fooSource(props: string): string {
	return [
		`/** A foo. */`,
		`export function Foo(props: { ${props} }) {`,
		`\treturn null`,
		`}`,
		'',
	].join('\n')
}

/**
 * Lay down a throwaway package that the extractor can open, with one barrel.
 * `noLib` keeps the project small, as in `api-extractor.test.ts`.
 */
function writeFixture(root: string): string {
	const src = path.join(root, 'src')

	fs.writeFileSync(
		path.join(root, 'tsconfig.json'),
		JSON.stringify({
			compilerOptions: {
				strict: true,
				jsx: 'react-jsx',
				module: 'ESNext',
				moduleResolution: 'Bundler',
				noLib: true,
			},
		}),
	)

	const files: Record<string, string> = {
		'components/foo/index.ts': `export { Foo } from './foo'\n`,
		'components/foo/foo.tsx': fooSource('label?: string'),
	}

	for (const [rel, text] of Object.entries(files)) {
		const full = path.join(src, rel)

		fs.mkdirSync(path.dirname(full), { recursive: true })

		fs.writeFileSync(full, text)
	}

	return src
}

const roots: string[] = []

const workers: ApiExtractorWorker[] = []

function start(): { srcDir: string; worker: ApiExtractorWorker } {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'extractor-worker-'))

	roots.push(root)

	const srcDir = writeFixture(root)

	const worker = startApiExtractorWorker(srcDir)

	workers.push(worker)

	return { srcDir, worker }
}

/** The prop names of Foo in a record. */
function fooProps(record: Record<string, { props: { name: string }[] }[]>): string[] {
	return record.foo?.[0]?.props.map((prop) => prop.name) ?? []
}

afterEach(async () => {
	await Promise.all(workers.splice(0).map((worker) => worker.close()))

	for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true })
})

describe('startApiExtractorWorker', () => {
	it('extracts the record in the worker', async () => {
		const { worker } = start()

		const record = await worker.getAll()

		expect(Object.keys(record)).toEqual(['foo'])

		expect(fooProps(record)).toEqual(['label'])
	})

	it('applies each change reported before a read', async () => {
		const { srcDir, worker } = start()

		await worker.getAll()

		const file = path.join(srcDir, 'components', 'foo', 'foo.tsx')

		fs.writeFileSync(file, fooSource('label?: string; tone?: string'))

		worker.notifyChanged(file)

		expect(fooProps(await worker.getAll())).toEqual(['label', 'tone'])
	})

	it('rejects a read after the worker closes', async () => {
		const { worker } = start()

		await worker.getAll()

		await worker.close()

		await expect(worker.getAll()).rejects.toThrow('exited')
	})
})
