// @vitest-environment node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { docsPlugin } from '../../plugins/docs'

// The hot-update path of the docs plugin, over a small source tree on disk: one
// barrel and one demo. A demo edit generates the demo-derived virtual modules
// again, and each joins the update only when its JSON changed.

type Module = { id: string }

/** The callable view of the plugin hooks that the tests invoke. */
type Hooks = {
	configResolved(config: { root: string }): void
	resolveId(id: string): string | undefined
	load(id: string): string | undefined
	handleHotUpdate(ctx: {
		file: string
		modules: Module[]
		server: {
			moduleGraph: {
				getModuleById(id: string): Module
				invalidateModule(mod: Module): void
			}
		}
	}): Module[] | undefined
}

let srcDir = ''

let demo = ''

beforeEach(() => {
	srcDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-hot-update-'))

	fs.mkdirSync(path.join(srcDir, 'components', 'button'), { recursive: true })

	fs.writeFileSync(
		path.join(srcDir, 'components', 'button', 'index.ts'),
		`export { Button } from './button'\n`,
	)

	fs.mkdirSync(path.join(srcDir, 'docs-legacy', 'demos'), { recursive: true })

	demo = path.join(srcDir, 'docs-legacy', 'demos', 'button.tsx')

	write(
		`import { Star } from 'lucide-react'\n\nexport const handle = { name: 'Button' }\n`,
		new Date(),
	)
})

afterEach(() => {
	fs.rmSync(srcDir, { recursive: true, force: true })
})

/** Write the demo, and set its mtime. */
function write(source: string, mtime: Date) {
	fs.writeFileSync(demo, source)

	fs.utimesSync(demo, mtime, mtime)
}

/** The docs plugin, resolved against the temp tree, with each virtual module served. */
function serve(): Hooks {
	const main = docsPlugin({ srcDir })[1] as unknown as Hooks

	main.configResolved({ root: path.join(srcDir, 'docs-legacy') })

	main.load(main.resolveId('virtual:component-modules') ?? '')

	return main
}

/** The ids of the modules that one demo edit invalidates. */
function hotUpdate(main: Hooks): string[] {
	const invalidated: string[] = []

	main.handleHotUpdate({
		file: demo,
		modules: [{ id: demo }],
		server: {
			moduleGraph: {
				getModuleById: (id) => ({ id }),
				invalidateModule: (mod) => {
					invalidated.push(mod.id)
				},
			},
		},
	})

	return invalidated
}

describe('docsPlugin hot update', () => {
	it('invalidates no virtual module for a demo edit that keeps its imports', () => {
		const main = serve()

		write(
			`import { Star } from 'lucide-react'\n\nexport const handle = { name: 'Button' }\n\nexport default function Demo() { return null }\n`,
			new Date(Date.now() + 60_000),
		)

		expect(hotUpdate(main)).toEqual([])
	})

	it('invalidates the module whose JSON a demo edit changes', () => {
		const main = serve()

		write(
			`import { Heart, Star } from 'lucide-react'\n\nexport const handle = { name: 'Button' }\n`,
			new Date(Date.now() + 60_000),
		)

		expect(hotUpdate(main)).toEqual(['\0virtual:component-modules'])
	})

	// The parse of a demo holds while its mtime holds, so an edit that keeps the
	// mtime reads as no edit. That reuse is what spares the other demos a parse.
	it('reuses the last parse of a demo whose mtime holds', () => {
		const main = serve()

		const { mtime } = fs.statSync(demo)

		write(
			`import { Heart, Star } from 'lucide-react'\n\nexport const handle = { name: 'Other' }\n`,
			mtime,
		)

		expect(hotUpdate(main)).toEqual([])
	})
})
