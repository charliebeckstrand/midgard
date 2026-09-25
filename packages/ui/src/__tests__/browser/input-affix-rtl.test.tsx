import { describe, expect, it } from 'vitest'
import { Input } from '../../components/input'
import { present, renderUI } from '../helpers'

/**
 * An affix slot pads the side that faces the frame edge. The frame is a flex
 * row, so a prefix sits at the inline start and a suffix at the inline end. In
 * a right-to-left control the slots mirror, and the pads must mirror with them.
 * jsdom resolves no `dir`, so the case runs here.
 */
describe('input affix padding in right-to-left (real browser)', () => {
	for (const dir of ['ltr', 'rtl'] as const) {
		it(`pads each affix slot on its frame-edge side (${dir})`, () => {
			const { container } = renderUI(
				<div dir={dir}>
					<Input aria-label="Amount" prefix="$" suffix="USD" />
				</div>,
			)

			const prefix = present(container.querySelector('[data-slot="prefix"]'), 'the prefix slot')

			const suffix = present(container.querySelector('[data-slot="suffix"]'), 'the suffix slot')

			const edge = (el: HTMLElement, side: 'start' | 'end') => {
				const { paddingLeft, paddingRight } = getComputedStyle(el)

				const left = dir === 'ltr' ? side === 'start' : side === 'end'

				return { edge: left ? paddingLeft : paddingRight, inner: left ? paddingRight : paddingLeft }
			}

			const prefixPad = edge(prefix, 'start')

			const suffixPad = edge(suffix, 'end')

			expect(Number.parseFloat(prefixPad.edge)).toBeGreaterThan(0)

			expect(prefixPad.inner).toBe('0px')

			expect(Number.parseFloat(suffixPad.edge)).toBeGreaterThan(0)

			expect(suffixPad.inner).toBe('0px')
		})
	}
})
