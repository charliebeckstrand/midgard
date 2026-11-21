import { readFileSync } from 'node:fs'
import { parseImports, resolveSource } from './source-imports'
import { srcRelative } from './walk-source'

/**
 * Each path from `entry` to a file that `isTarget` accepts, through the runtime
 * imports and re-exports of the module graph. Each path is a chain of files
 * relative to `srcDir`, such as `a.ts → b.ts → target.ts`.
 *
 * @remarks The walk follows each relative specifier that survives compilation,
 * and barrels too. Thus it can report more than a bundler keeps, but never
 * less. A type-only import does not count, and the walk does not enter a
 * target. A dynamic `import()` is not a static import, so the walk does not
 * follow it.
 */
export function runtimePathsTo(entry: string, isTarget: (file: string) => boolean): string[] {
	const parents = new Map<string, string | null>([[entry, null]])

	const queue = [entry]

	const found: string[] = []

	for (let file = queue.shift(); file !== undefined; file = queue.shift()) {
		for (const { specifier, runtime } of parseImports(readFileSync(file, 'utf8'))) {
			if (!runtime || !specifier.startsWith('.')) continue

			const next = resolveSource(file, specifier)

			if (next === undefined || parents.has(next)) continue

			parents.set(next, file)

			if (!isTarget(next)) {
				queue.push(next)

				continue
			}

			const chain: string[] = []

			for (let at: string | null | undefined = next; at; at = parents.get(at)) {
				chain.push(srcRelative(at))
			}

			found.push(chain.reverse().join(' → '))
		}
	}

	return found
}
