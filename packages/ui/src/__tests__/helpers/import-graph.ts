import { readFileSync } from 'node:fs'
import { parseImports, resolveSource } from './source-imports'
import { srcRelative } from './walk-source'

/**
 * Each path from `entry` to a file that `isTarget` accepts, through the runtime
 * imports and re-exports of the module graph. Each path is a chain of files
 * relative to `srcDir`, such as `a.ts → b.ts → target.ts`.
 *
 * @remarks The walk follows each relative specifier that survives compilation,
 * a bare `import './x'` included, and barrels too. Thus it can report more
 * than a bundler keeps. A type-only import does not count, and the walk does
 * not enter a target. A dynamic `import()` is not a static import, so the walk
 * does not follow it.
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

/**
 * Each file that the runtime imports of `entries` reach, the entries included.
 * The walk follows the same imports as {@link runtimePathsTo}. A file that
 * `isBoundary` accepts is a boundary: the walk does not enter it, and the
 * result does not hold it. An entry is never a boundary, so a check can read
 * an entry that `isBoundary` would accept.
 *
 * @param entries - The absolute paths that the walk starts from.
 * @param isBoundary - Whether the walk stops at a file, given its path and its source.
 * @returns The absolute paths of the files that the walk reached.
 */
export function runtimeFiles(
	entries: readonly string[],
	isBoundary: (file: string, source: string) => boolean = () => false,
): Set<string> {
	const reached = new Set<string>()

	const seen = new Set<string>(entries)

	const queue = [...entries]

	for (let file = queue.shift(); file !== undefined; file = queue.shift()) {
		const source = readFileSync(file, 'utf8')

		if (!entries.includes(file) && isBoundary(file, source)) continue

		reached.add(file)

		for (const { specifier, runtime } of parseImports(source)) {
			if (!runtime || !specifier.startsWith('.')) continue

			const next = resolveSource(file, specifier)

			if (next === undefined || seen.has(next)) continue

			seen.add(next)

			queue.push(next)
		}
	}

	return reached
}
