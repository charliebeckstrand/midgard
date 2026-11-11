import { basename } from 'node:path'

// The check of the name-scope rule (CONVENTIONS.md §8.4). A name does not
// repeat what its scope already says. `name-scope-boundary.test.ts` applies it
// to ui, and `app-name-boundary.test.ts` applies it to the apps and the other
// packages.

/** File-name words that tell nothing about the code in the file. */
const NOISE = new Set(['use', 'utilities', 'index'])

/** A top-level function declaration, or a top-level `const` that holds a function. */
const PRIVATE_FUNCTION =
	/^(?:async\s+)?function\*?\s+([a-z][A-Za-z0-9]*)|^const\s+([a-z][A-Za-z0-9]*)\s*(?::[^=]+)?=\s*(?:async\s+)?(?:function\b|(?:<[^>]*>)?\([^)]*\)\s*(?::[^=]+)?=>|[a-z]\w*\s*=>)/gm

/** The lowercase words of a camelCase name or a kebab-case file name. */
export function splitWords(name: string): string[] {
	return name
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.toLowerCase()
		.split(/[\s-]+/)
}

/**
 * Each file-private function in `source` that repeats two or more words of the
 * name of its file, after the first word of the function name.
 *
 * @remarks
 * One repeated word is often the object of the verb, as `scrollToLetter` in
 * `letter-rail.tsx` shows, so the check does not report it. An export is
 * exempt, because its importers do not read the file name. The caller gives
 * `source` with its comments blanked.
 */
export function findRepeatedNames(path: string, source: string): string[] {
	const fileWords = new Set(
		splitWords(basename(path).replace(/\.\w+$/, '')).filter((word) => !NOISE.has(word)),
	)

	const found: string[] = []

	for (const match of source.matchAll(PRIVATE_FUNCTION)) {
		const name = match[1] ?? match[2]

		if (!name) continue

		const repeated = new Set(
			splitWords(name)
				.slice(1)
				.filter((word) => fileWords.has(word)),
		)

		if (repeated.size >= 2) found.push(name)
	}

	return found
}
