import { describe, expect, it } from 'vitest'
import { css } from '../../recipes/kiso/ugoki/css'

describe('ugoki css transitions', () => {
	it('gates every fragment behind motion-safe so it no-ops under reduced motion (WCAG 2.3.3)', () => {
		for (const fragment of Object.values(css)) {
			expect(fragment.startsWith('motion-safe:')).toBe(true)
		}
	})
})
