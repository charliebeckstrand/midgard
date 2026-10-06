import { within as inside } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ColorPanel, ColorPicker } from '../../../components/color'
import { getSlot, present, renderUI } from '../../helpers'

/** The box of the character at `index` in the text of `el`. */
function charBox(el: HTMLElement, index: number) {
	const text = el.firstChild

	if (!(text instanceof Text)) throw new Error('expected the label to hold one text node')

	const range = document.createRange()

	range.setStart(text, index)

	range.setEnd(text, index + 1)

	return range.getBoundingClientRect()
}

/**
 * A hex code reads left to right in each direction, as CodeBlock reads code.
 *
 * The trigger label and the hex field took the inherited direction. In a
 * right-to-left scope, the bidi algorithm put the '#' of "#FF0000" at the right
 * and the '#' of "#00FF00" at the left. The flex row of the hex field put the
 * '#' prefix at the right and the copy button at the left. jsdom does no bidi
 * layout, so the cases run in the real browser.
 */
describe('the hex code of a color in right-to-left (real browser)', () => {
	for (const dir of ['ltr', 'rtl'] as const) {
		it.each(['#ff0000', '#00ff00'])(
			`puts the # of the %s trigger label at the left (${dir})`,
			(color) => {
				const { container } = renderUI(
					<div dir={dir}>
						<ColorPicker defaultValue={color} />
					</div>,
				)

				const label = inside(getSlot(container, 'color-picker-button')).getByText(
					color.toUpperCase(),
				)

				expect(charBox(label, 0).left).toBeLessThan(charBox(label, 1).left)
			},
		)

		it(`puts the # prefix at the left of the hex field and the copy button at the right (${dir})`, () => {
			const { container } = renderUI(
				<div dir={dir}>
					<ColorPanel defaultValue="#ff0000" />
				</div>,
			)

			const input = getSlot<HTMLInputElement>(container, 'color-hex-input')

			const frame = present(
				input.closest('[data-slot="control-frame"]'),
				'the frame of the hex field',
			)

			const inputLeft = input.getBoundingClientRect().left

			expect(getSlot(frame, 'prefix').getBoundingClientRect().left).toBeLessThan(inputLeft)

			expect(getSlot(frame, 'suffix').getBoundingClientRect().left).toBeGreaterThan(inputLeft)

			expect(getComputedStyle(input).direction).toBe('ltr')
		})
	}
})
