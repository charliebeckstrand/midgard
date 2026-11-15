// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { collapse } from '../../recipes/kiso/ugoki/collapse'
import { css } from '../../recipes/kiso/ugoki/css'

describe('ugoki css transitions', () => {
	it('gates every fragment behind motion-safe so it no-ops under reduced motion (WCAG 2.3.3)', () => {
		for (const fragment of Object.values(css)) {
			expect(fragment.startsWith('motion-safe:')).toBe(true)
		}
	})

	it('states the tempo of collapse in css.collapse, so a chevron turns in the time of its panel', () => {
		const { duration, ease } = collapse.fade.transition

		// Framer Motion names `easeInOut` for the CSS curve `cubic-bezier(0.42, 0, 0.58, 1)`.
		expect(ease).toBe('easeInOut')

		expect(css.collapse.split(' ')).toEqual([
			`motion-safe:duration-${duration * 1000}`,
			'motion-safe:ease-[cubic-bezier(0.42,0,0.58,1)]',
		])
	})
})
