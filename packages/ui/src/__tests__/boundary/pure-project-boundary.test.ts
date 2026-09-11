import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DOM_EXCEPTIONS, PURE_DIRS, pureTestFiles } from '../helpers/pure-files'
import { srcDir, stripSourceComments } from '../helpers/walk-source'

// The `pure` project runs its files in a node environment with no jsdom, no
// module doubles, and no RTL setup (vitest.config.ts). A file that reaches for
// the DOM there fails at runtime, but only on the line that reaches, and only
// once the test runs; this gate fails it by name at the boundary instead. The
// exceptions list is held to the same standard in reverse, so a file that
// stops reading the DOM leaves the list and moves to the fast project.

const packageRoot = join(srcDir, '..')

// Any token that needs a window. `render`/`renderHook`/`screen` cover RTL,
// the bare identifiers cover hand-built nodes and hook tests, and the
// package name covers matchers and user-event.
const DOM_TOKEN =
	/\b(?:document|window|navigator|HTMLElement|matchMedia)\b|@testing-library|\brender(?:UI|Hook)?\(|\bscreen\./g

function domTokens(file: string): string[] {
	const text = stripSourceComments(readFileSync(join(packageRoot, file), 'utf8'))

	return [...new Set([...text.matchAll(DOM_TOKEN)].map((match) => match[0]))]
}

describe('pure project boundary', () => {
	it('no file in the pure project reads the DOM', () => {
		const violations = pureTestFiles(packageRoot).flatMap((file) => {
			const tokens = domTokens(file)

			return tokens.length ? [`${file} → ${tokens.join(', ')}`] : []
		})

		expect(
			violations,
			'a pure-project file reads the DOM — move the DOM half to a `.test.tsx` file, or add the file to DOM_EXCEPTIONS in helpers/pure-files.ts so the jsdom project runs it',
		).toEqual([])
	})

	it('every DOM exception still reads the DOM', () => {
		const stale = [...DOM_EXCEPTIONS].filter(
			(file) => domTokens(`src/__tests__/${file}`).length === 0,
		)

		expect(
			stale,
			'a DOM exception no longer reads the DOM — drop it from DOM_EXCEPTIONS in helpers/pure-files.ts so the pure project runs it',
		).toEqual([])
	})

	it('every DOM exception names a file that exists in a pure directory', () => {
		const missing = [...DOM_EXCEPTIONS].filter((file) => {
			const [dir] = file.split('/')

			return (
				!PURE_DIRS.includes(dir as (typeof PURE_DIRS)[number]) ||
				!readFileSync(join(srcDir, '__tests__', file)).length
			)
		})

		expect(missing, 'a DOM exception names a file that moved or was deleted').toEqual([])
	})
})
