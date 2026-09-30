import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { collectPatternViolations, srcDir } from '../helpers/walk-source'

// The geometry category states each tolerance by name (CONVENTIONS.md §10.5).
// `toBeCloseTo` hides its tolerance in a count of decimal digits, and with no
// count it passes a miss of up to 0.005. A comparison that a test writes with
// `Math.abs` hides the tolerance in a bare number, and a failure prints only
// `false`. The geometry matchers take the tolerance as a value, which a name
// from `helpers/geometry/tolerance.ts` or a file constant gives, and a failure
// prints the difference.

const testsDir = join(srcDir, '__tests__')

const GEOMETRY_DIRS = [join(testsDir, 'geometry'), join(testsDir, 'browser', 'geometry')]

const PATTERNS = [
	{ label: 'toBeCloseTo, not toBeNear with a named tolerance', regex: /\.toBeCloseTo\(/g },
	{
		label: 'a comparison through Math.abs, not toBeNear with a named tolerance',
		regex: /expect\(\s*Math\.abs\(/g,
	},
] as const

describe('geometry tolerance boundary', () => {
	it('states each tolerance of a geometry test through a matcher', () => {
		const violations = GEOMETRY_DIRS.flatMap((dir) =>
			collectPatternViolations({ dir, patterns: PATTERNS, stripComments: true }),
		)

		expect(
			violations,
			'a geometry test compares with a hidden tolerance — use toBeNear, toMatchBox, or toContainBox with a named tolerance',
		).toEqual([])
	})
})
