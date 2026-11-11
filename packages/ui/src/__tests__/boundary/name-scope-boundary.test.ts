import { describe, expect, it } from 'vitest'
import { findRepeatedNames } from '../helpers/name-scope'
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
// This test checks the mechanical half of the rule in ui (`findRepeatedNames`).
// `app-name-boundary.test.ts` checks the apps and the other packages. Review
// covers the rest of the rule.

/** Each file-private function in ui that repeats two or more words of its file name. */
function repeatedNames(): string[] {
	const found: string[] = []

	walkSource(srcDir, (path, source) => {
		if (!isSourceFile(path) || path.endsWith('.d.ts')) return

		for (const name of findRepeatedNames(path, stripSourceComments(source))) {
			found.push(`${srcRelative(path)}: ${name}`)
		}
	})

	return found
}

describe('name-scope boundary', () => {
	it('a file-private function does not repeat two words of its file name', () => {
		expect(repeatedNames()).toEqual([])
	})
})
