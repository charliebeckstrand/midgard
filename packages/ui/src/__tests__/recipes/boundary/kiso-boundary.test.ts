import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { collectPatternViolations } from '../../helpers/walk-source'

// kiso/ holds the design-system tokens — both the primitive atomic concerns
// (iro, ji, ma, sun, sen, omote, hannou, narabi, kasane, tsunagi, ugoki,
// shaku, kokkaku) and the semantic archetype bundles (control, popover,
// segment, panel, slider) composed from them. kiso sits at the bottom of the
// recipe stack: kiso modules may compose siblings within kiso, but importing
// from katakana, kata, components, layouts, primitives, hooks, or providers
// inverts the dependency direction or pulls stateful React context into the
// recipe substrate.
//
// This test pins the mechanical half of the contract: kiso has no upward
// dependencies. Per-module consumer documentation lives in recipes/kiso/README.md.

const kisoDir = join(__dirname, '../../../recipes/kiso')
const srcDir = join(__dirname, '../../..')

const FORBIDDEN_PATTERNS = [
	{ label: 'recipes/katakana/', regex: /from\s+['"][^'"]*\/recipes\/katakana\/[^'"]+['"]/g },
	{ label: 'recipes/kata/', regex: /from\s+['"][^'"]*\/recipes\/kata\/[^'"]+['"]/g },
	{ label: 'components/', regex: /from\s+['"][^'"]*\/components\/[^'"]+['"]/g },
	{ label: 'layouts/', regex: /from\s+['"][^'"]*\/layouts\/[^'"]+['"]/g },
	{ label: 'primitives/', regex: /from\s+['"][^'"]*\/primitives\/[^'"]+['"]/g },
	{ label: 'hooks/', regex: /from\s+['"][^'"]*\/hooks\/[^'"]+['"]/g },
	{ label: 'providers/', regex: /from\s+['"][^'"]*\/providers\/[^'"]+['"]/g },
] as const

describe('kiso purity boundary', () => {
	it('kiso does not import from katakana, kata, components, layouts, primitives, hooks, or providers', () => {
		const violations = collectPatternViolations({
			dir: kisoDir,
			srcDir,
			patterns: FORBIDDEN_PATTERNS,
		})

		expect(
			violations,
			`kiso reaches upward into higher layers:\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})
})
