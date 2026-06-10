import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { collectPatternViolations } from '../../helpers/walk-source'

// Primitives are foundational React/HTML abstractions consumed by components.
// They must not import from components or layouts. Imports from
// `recipes/kata/` (the recipe funnel) are
// permitted; kata is the curated recipe surface for both components and
// primitives.

const primitivesDir = join(__dirname, '../../../primitives')

const srcDir = join(__dirname, '../../..')

const FORBIDDEN_PATTERNS = [
	{ label: 'components/', regex: /from\s+['"][^'"]*\/components\/[^'"]+['"]/g },
	{ label: 'layouts/', regex: /from\s+['"][^'"]*\/layouts\/[^'"]+['"]/g },
] as const

describe('primitive purity boundary', () => {
	it('primitives do not import from components or layouts', () => {
		const violations = collectPatternViolations({
			dir: primitivesDir,
			srcDir,
			patterns: FORBIDDEN_PATTERNS,
		})

		expect(
			violations,
			`primitives reach upward into the component / layout layer:\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})
})
