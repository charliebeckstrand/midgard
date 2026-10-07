import { existsSync, readFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { importsOf } from '../helpers/source-imports'
import { srcDir, srcRelative } from '../helpers/walk-source'

// `Grid` loads its drag and drop module only when it takes a reorder, and its
// dialogs only when one opens (see `grid-region.tsx` and `grid-data-dialogs.tsx`).
// A bundler keeps each static import, so one static import of `@dnd-kit` or of a
// dialog in the module graph of `Grid` loads it for each grid. This test walks
// that graph. A dynamic `import()` is not a static import, so the walk does not
// follow it.

const gridDir = join(srcDir, 'modules', 'grid')

const gridModule = join(gridDir, 'grid.tsx')

/** The modules that only the dialogs of the grid load. */
const dialogModules = [
	'grid-auto-size-confirm-dialog.tsx',
	'grid-column-manager.tsx',
	'grid-data-dialogs-body.tsx',
	'grid-group-manager.tsx',
	'grid-manager-dialog.tsx',
	'grid-row-manager.tsx',
].map((file) => join(gridDir, file))

/** The source file that a relative specifier names, or `undefined`. */
function resolveSource(from: string, specifier: string): string | undefined {
	const base = resolve(dirname(from), specifier)

	return [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')].find(
		existsSync,
	)
}

/**
 * The static module graph of `entry`: each file it reaches, with the file that
 * imports it, and each runtime import of `@dnd-kit` as the chain of files from
 * `entry` to the import. The walk does not enter a barrel (`index.ts`), because
 * a bundler drops the names of a barrel that a module does not use.
 */
function staticGraph(entry: string): { files: Set<string>; dnd: string[] } {
	const parents = new Map<string, string | null>([[entry, null]])

	const chainOf = (file: string) => {
		const chain: string[] = []

		for (let at: string | null | undefined = file; at; at = parents.get(at)) {
			chain.push(srcRelative(at))
		}

		return chain.reverse()
	}

	const queue = [entry]

	const dnd: string[] = []

	for (let file = queue.shift(); file !== undefined; file = queue.shift()) {
		for (const { specifier, runtime } of importsOf(readFileSync(file, 'utf8'))) {
			if (!runtime) continue

			if (specifier.startsWith('@dnd-kit/')) {
				dnd.push([...chainOf(file), `'${specifier}'`].join(' → '))

				continue
			}

			if (!specifier.startsWith('.')) continue

			const next = resolveSource(file, specifier)

			if (next === undefined || parents.has(next) || basename(next).startsWith('index.')) continue

			parents.set(next, file)

			queue.push(next)
		}
	}

	return { files: new Set(parents.keys()), dnd }
}

describe('grid lazy boundary', () => {
	const graph = staticGraph(gridModule)

	it('Grid loads no @dnd-kit before it takes a reorder', () => {
		expect(graph.dnd, `\`Grid\` must not load \`@dnd-kit\`:\n  ${graph.dnd.join('\n  ')}`).toEqual(
			[],
		)
	})

	it('Grid loads no dialog before one opens', () => {
		const reached = dialogModules.filter((file) => graph.files.has(file)).map(srcRelative)

		expect(reached, `\`Grid\` must not load a dialog module:\n  ${reached.join('\n  ')}`).toEqual(
			[],
		)
	})

	it('detects the @dnd-kit import of the drag and drop module', () => {
		expect(staticGraph(join(gridDir, 'grid-reorder-region.tsx')).dnd).not.toEqual([])
	})

	it('detects the dialog modules of the dialogs module', () => {
		const { files } = staticGraph(join(gridDir, 'grid-data-dialogs-body.tsx'))

		expect(dialogModules.filter((file) => !files.has(file)).map(srcRelative)).toEqual([])
	})
})
