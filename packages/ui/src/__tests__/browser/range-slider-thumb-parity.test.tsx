import { afterEach, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Control } from '../../components/control'
import { RangeSlider } from '../../components/slider'
import { allBySlot, present, renderUI } from '../helpers'

/**
 * A `RangeSlider` thumb shows the rings of the native thumb of `Slider` (`kata/slider.ts`), in
 * each mode.
 *
 * Before, an invalid range thumb set `data-invalid` but kept its 1px rest ring, and a focused range
 * thumb kept the light-mode blue ring in dark mode. Chromium gives no computed style for
 * `::-webkit-slider-thumb`, so each case reads the ring of the range thumb from its `box-shadow`
 * and compares it with the width and the color that the `Slider` recipe names. A probe span gives
 * the color, so the case does not copy a color value.
 *
 * The file runs in the real browser, because jsdom loads no stylesheet.
 */
describe('the RangeSlider thumb ring against the Slider thumb ring (real browser)', () => {
	afterEach(() => {
		document.documentElement.classList.remove('dark')
	})

	function renderThumb(invalid: boolean) {
		const slider = <RangeSlider defaultValue={[20, 80]} />

		const { container } = renderUI(
			<>
				{invalid ? <Control severity="error">{slider}</Control> : slider}
				<span data-probe="red" className="text-red-600" />
				<span data-probe="blue" className="text-blue-600 dark:text-blue-500" />
			</>,
		)

		const probe = (name: string) =>
			getComputedStyle(present(container.querySelector(`[data-probe="${name}"]`), name)).color

		const [lo] = allBySlot(container, 'slider-range-thumb')

		return { thumb: present(lo, 'the start thumb'), probe }
	}

	/** The ring layer of a Tailwind `box-shadow`: the one shadow with no offset and a spread. */
	const ring = (el: Element) =>
		getComputedStyle(el)
			.boxShadow.match(/([a-z]+\([^)]*\)) 0px 0px 0px ([1-9]\d*)px/)
			?.slice(1)

	describe.each([
		['light', false],
		['dark', true],
	])('%s', (_mode, dark) => {
		it('rings an invalid thumb in red at 2px', () => {
			if (dark) document.documentElement.classList.add('dark')

			const { thumb, probe } = renderThumb(true)

			expect(ring(thumb)).toEqual([probe('red'), '2'])
		})

		it('rings a keyboard-focused thumb in the blue of the mode at 4px', async () => {
			if (dark) document.documentElement.classList.add('dark')

			const { thumb, probe } = renderThumb(false)

			thumb.focus()

			await userEvent.keyboard('{ArrowRight}')

			expect(ring(thumb)).toEqual([probe('blue'), '4'])
		})
	})
})
