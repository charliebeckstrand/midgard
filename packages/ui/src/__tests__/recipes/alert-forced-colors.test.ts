// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { k } from '../../recipes/kata/alert'

/**
 * Under forced colors, each variant of the alert keeps a visible edge.
 *
 * Soft and solid draw the alert with only a background, which forced colors
 * replace. The outline variant draws its edge with a `ring-1` box-shadow, which
 * forced colors remove. Without a forced outline, the alert reads as body text.
 */
describe('alert under forced colors', () => {
	const variants = ['soft', 'solid', 'outline'] as const

	it.each(variants)('keeps an edge on the %s variant', (variant) => {
		const classes = k({ variant, color: 'red' }).split(/\s+/)

		expect(classes).toContain('forced-colors:outline')
	})
})
