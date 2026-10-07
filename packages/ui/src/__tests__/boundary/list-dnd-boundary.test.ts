import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { importsOf } from '../helpers/source-imports'
import { srcDir, srcRelative } from '../helpers/walk-source'

// `List` is the read-only list, and `ListSortable` holds the reorder. A bundler
// keeps each static import, so one runtime import of `@dnd-kit` in the module
// graph of `List` loads the drag library for each read-only list. This test
// walks that graph.

const listModule = join(srcDir, 'components', 'list', 'list.tsx')

const sortableListModule = join(srcDir, 'components', 'list', 'list-sortable.tsx')

/** The source file that a relative specifier names, or `undefined`. */
function resolveSource(from: string, specifier: string): string | undefined {
	const base = resolve(dirname(from), specifier)

	return [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')].find(
		existsSync,
	)
}

/**
 * Each runtime import of `@dnd-kit` in the module graph of `entry`, as the chain
 * of files from `entry` to the import. The walk follows each runtime relative
 * import and re-export, barrels included, so it can report more than a bundler
 * keeps, never less.
 */
function dndReaches(entry: string): string[] {
	const parents = new Map<string, string | null>([[entry, null]])

	const queue = [entry]

	const found: string[] = []

	for (let file = queue.shift(); file !== undefined; file = queue.shift()) {
		for (const { specifier, runtime } of importsOf(readFileSync(file, 'utf8'))) {
			if (!runtime) continue

			if (specifier.startsWith('@dnd-kit/')) {
				const chain = [`'${specifier}'`]

				for (let at: string | null | undefined = file; at; at = parents.get(at)) {
					chain.push(srcRelative(at))
				}

				found.push(chain.reverse().join(' → '))

				continue
			}

			if (!specifier.startsWith('.')) continue

			const next = resolveSource(file, specifier)

			if (next === undefined || parents.has(next)) continue

			parents.set(next, file)

			queue.push(next)
		}
	}

	return found
}

describe('list dnd-kit boundary', () => {
	it('List loads no @dnd-kit', () => {
		const reaches = dndReaches(listModule)

		expect(
			reaches,
			`\`List\` must not load \`@dnd-kit\`; put the reorder in \`ListSortable\`:\n  ${reaches.join('\n  ')}`,
		).toEqual([])
	})

	it('detects the @dnd-kit import of ListSortable', () => {
		expect(dndReaches(sortableListModule)).not.toEqual([])
	})
})
