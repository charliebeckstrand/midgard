import { existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { srcDir, stripSourceComments, walkSource } from '../helpers/walk-source'

// App gap boundary.
//
// The gap of a layout follows the density of the reader. A structure unit
// (Flex, Stack, Columns, Split) takes its gap from the `gap` prop, on the
// shared spacing scale, and each stop of the scale steps with the nearest
// density scope. A `gap-*` or `space-*` class has the same length at each
// step, and a class on a ui component overrides the gap that the component
// steps. So the apps and the shared package write no gap class. A layout with
// a gap is a structure unit, and a component keeps its own gap.

/** The workspace root, so the scan reaches the apps and the shared package. */
const workspaceRoot = join(srcDir, '..', '..', '..')

/** The trees to scan: the source of each app and of the shared package. */
const SCAN_ROOTS = [join(workspaceRoot, 'apps'), join(workspaceRoot, 'packages', 'shared')].filter(
	(root) => existsSync(root),
)

/** A gap or a space class, with any variant prefix: `gap-4`, `sm:gap-x-2`, `space-y-6`, `-space-x-1`. */
const GAP_CLASS = /(?<![\w[-])-?(?:gap|gap-x|gap-y|space-x|space-y)-(?:\d|px\b|\[|\()/

/** Each source file outside the tests, keyed by its path from the workspace root, with no comments. */
function sourceFiles(): Map<string, string> {
	const files = new Map<string, string>()

	for (const root of SCAN_ROOTS) {
		walkSource(root, (path, source) => {
			if (!/\.(?:tsx?|mts|cts)$/.test(path) || /[\\/]__tests__[\\/]|\.test\.tsx?$/.test(path)) {
				return
			}

			files.set(relative(workspaceRoot, path).split(sep).join('/'), stripSourceComments(source))
		})
	}

	return files
}

describe('app gap boundary', () => {
	const files = sourceFiles()

	it('reads the source of the apps', () => {
		// A walk that read no file would pass the case below with an empty list.
		expect(files.size).toBeGreaterThan(100)
	})

	it('writes no gap class in the apps or the shared package', () => {
		const violations = [...files].flatMap(([key, code]) =>
			code
				.split('\n')
				.flatMap((line, index) =>
					GAP_CLASS.test(line) ? [`${key}:${index + 1}: ${line.trim()}`] : [],
				),
		)

		expect(
			violations,
			`lines with a gap class (use the \`gap\` prop of Flex, Stack, Columns, or Split, and let a ui component keep its own gap):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})
})
