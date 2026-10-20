import { basename } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
	isSourceFile,
	srcDir,
	srcRelative,
	stripSourceComments,
	walkSource,
} from '../helpers/walk-source'

// Name-scope boundary (CONVENTIONS.md §8.4).
//
// A name does not repeat what its scope already says. A file-private function
// in `use-grid-fill-handle.ts` is `createHandle`, not `createGridFillHandle`,
// because the reader of that file already knows the grid and the fill.
//
// This test checks the mechanical half of the rule. It splits the file name
// into words, and it reports a file-private function whose name holds two or
// more of those words after its first word. One repeated word is often the
// object of the verb, as `scrollToLetter` in `letter-rail.tsx` shows, so the
// test does not report it. An export is exempt, because its importers do not
// read the file name. Review covers the rest of the rule.

/** File-name words that tell nothing about the code in the file. */
const NOISE = new Set(['use', 'utilities', 'index'])

/** A top-level function declaration, or a top-level `const` that holds a function. */
const PRIVATE_FUNCTION =
	/^(?:async\s+)?function\*?\s+([a-z][A-Za-z0-9]*)|^const\s+([a-z][A-Za-z0-9]*)\s*(?::[^=]+)?=\s*(?:async\s+)?(?:function\b|(?:<[^>]*>)?\([^)]*\)\s*(?::[^=]+)?=>|[a-z]\w*\s*=>)/gm

function words(name: string): string[] {
	return name
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.toLowerCase()
		.split(/[\s-]+/)
}

/** Each file-private function that repeats two or more words of its file name. */
function repeatedNames(): string[] {
	const found: string[] = []

	walkSource(srcDir, (path, source) => {
		if (!isSourceFile(path) || path.endsWith('.d.ts')) return

		const fileWords = new Set(
			words(basename(path).replace(/\.\w+$/, '')).filter((word) => !NOISE.has(word)),
		)

		for (const match of stripSourceComments(source).matchAll(PRIVATE_FUNCTION)) {
			const name = match[1] ?? match[2]

			if (!name) continue

			const repeated = new Set(
				words(name)
					.slice(1)
					.filter((word) => fileWords.has(word)),
			)

			if (repeated.size >= 2) found.push(`${srcRelative(path)}: ${name}`)
		}
	})

	return found
}

describe('name-scope boundary', () => {
	it('a file-private function does not repeat two words of its file name', () => {
		expect(repeatedNames()).toEqual([])
	})
})
