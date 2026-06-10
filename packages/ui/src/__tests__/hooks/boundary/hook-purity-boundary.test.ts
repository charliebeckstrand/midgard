import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { collectPatternViolations } from '../../helpers/walk-source'

// Top-level hooks are reusable building blocks consumed by components,
// primitives, and other hooks. They must not import from components, layouts,
// providers, or recipe-layer internals (kata / katakana). Importing from
// primitives is allowed; hooks may read context from primitive providers.

const hooksDir = join(__dirname, '../../../hooks')
const srcDir = join(__dirname, '../../..')

const FORBIDDEN_PATTERNS = [
	{ label: 'components/', regex: /from\s+['"][^'"]*\/components\/[^'"]+['"]/g },
	{ label: 'layouts/', regex: /from\s+['"][^'"]*\/layouts\/[^'"]+['"]/g },
	{ label: 'providers/', regex: /from\s+['"][^'"]*\/providers\/[^'"]+['"]/g },
	{ label: 'recipes/kata/', regex: /from\s+['"][^'"]*\/recipes\/kata\/[^'"]+['"]/g },
	{ label: 'recipes/katakana/', regex: /from\s+['"][^'"]*\/recipes\/katakana\/[^'"]+['"]/g },
] as const

describe('hook purity boundary', () => {
	it('top-level hooks do not import from components, layouts, providers, or recipe-layer internals', () => {
		const violations = collectPatternViolations({
			dir: hooksDir,
			srcDir,
			patterns: FORBIDDEN_PATTERNS,
		})

		expect(
			violations,
			`top-level hooks reach upward into higher layers:\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})
})
