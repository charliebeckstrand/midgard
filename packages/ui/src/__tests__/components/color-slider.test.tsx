import { describe, expect, it, vi } from 'vitest'
import { ColorPanel } from '../../components/color'
import type { Hsva } from '../../components/color/types'
import { fireEvent, getAllSlots, getSlot, renderUI } from '../helpers'

const start: Hsva = { h: 180, s: 50, v: 50, a: 0.5 }

function setup(initial: Hsva = start, disabled = false) {
	const onValueChange = vi.fn<(value: Hsva) => void>()

	const { container } = renderUI(
		<ColorPanel
			alpha
			disabled={disabled}
			format="hsva"
			defaultValue={initial}
			onValueChange={onValueChange}
		/>,
	)

	const [hue, alpha] = getAllSlots(container, 'color-slider')

	if (!hue || !alpha) throw new Error('expected a hue and an alpha slider')

	return { hue, alpha, onValueChange }
}

// The width of the track in the bounding rect that the drag tests give.
const WIDTH = 200

function giveRect(el: HTMLElement) {
	el.getBoundingClientRect = () => DOMRect.fromRect({ width: WIDTH, height: 20 })
}

describe('ColorSlider (hue)', () => {
	it('announces the hue in degrees', () => {
		const { hue } = setup()

		expect(hue).toHaveAttribute('aria-label', 'Hue')

		expect(hue).toHaveAttribute('aria-valuemax', '360')

		expect(hue).toHaveAttribute('aria-valuenow', '180')

		expect(hue).toHaveAttribute('aria-valuetext', '180°')
	})

	it('steps by 1 on the arrows and by 10 with Shift', () => {
		const { hue } = setup()

		fireEvent.keyDown(hue, { key: 'ArrowRight' })

		expect(hue).toHaveAttribute('aria-valuenow', '181')

		fireEvent.keyDown(hue, { key: 'ArrowUp', shiftKey: true })

		expect(hue).toHaveAttribute('aria-valuenow', '191')

		fireEvent.keyDown(hue, { key: 'ArrowLeft' })

		expect(hue).toHaveAttribute('aria-valuenow', '190')

		fireEvent.keyDown(hue, { key: 'ArrowDown', shiftKey: true })

		expect(hue).toHaveAttribute('aria-valuenow', '180')
	})

	it('pins the ends on Home and End, and clamps a step past an end', () => {
		const { hue } = setup()

		fireEvent.keyDown(hue, { key: 'End' })

		expect(hue).toHaveAttribute('aria-valuenow', '360')

		fireEvent.keyDown(hue, { key: 'PageUp' })

		expect(hue).toHaveAttribute('aria-valuenow', '360')

		fireEvent.keyDown(hue, { key: 'Home' })

		expect(hue).toHaveAttribute('aria-valuenow', '0')

		fireEvent.keyDown(hue, { key: 'ArrowLeft' })

		expect(hue).toHaveAttribute('aria-valuenow', '0')
	})

	it('leaves an unbound key to the page', () => {
		const { hue, onValueChange } = setup()

		const handled = fireEvent.keyDown(hue, { key: 'a' })

		// `fireEvent` returns false only when a handler prevents the default.
		expect(handled).toBe(true)

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('sets the hue from the press position on the track', () => {
		const { hue, onValueChange } = setup()

		giveRect(hue)

		fireEvent.pointerDown(hue, { button: 0, pointerId: 1, clientX: WIDTH / 4 })

		expect(hue).toHaveAttribute('aria-valuenow', '90')

		expect(onValueChange).toHaveBeenLastCalledWith(expect.objectContaining({ h: 90, a: 0.5 }))
	})
})

describe('ColorSlider (alpha)', () => {
	it('announces the alpha as a percent over a 0-1 range', () => {
		const { alpha } = setup()

		expect(alpha).toHaveAttribute('aria-label', 'Alpha')

		expect(alpha).toHaveAttribute('aria-valuemax', '1')

		expect(alpha).toHaveAttribute('aria-valuenow', '0.5')

		expect(alpha).toHaveAttribute('aria-valuetext', '50%')
	})

	it('steps by 0.01 on the arrows, 0.1 with Shift, and 0.1 on the Page keys', () => {
		const { alpha } = setup()

		fireEvent.keyDown(alpha, { key: 'ArrowRight' })

		expect(alpha).toHaveAttribute('aria-valuenow', '0.51')

		fireEvent.keyDown(alpha, { key: 'ArrowLeft', shiftKey: true })

		expect(alpha).toHaveAttribute('aria-valuenow', '0.41')

		fireEvent.keyDown(alpha, { key: 'PageUp' })

		expect(alpha).toHaveAttribute('aria-valuenow', '0.51')

		fireEvent.keyDown(alpha, { key: 'PageDown', shiftKey: true })

		expect(alpha).toHaveAttribute('aria-valuenow', '0.41')
	})

	it('pins the alpha to 0 on Home and to 1 on End', () => {
		const { alpha } = setup()

		fireEvent.keyDown(alpha, { key: 'End' })

		expect(alpha).toHaveAttribute('aria-valuetext', '100%')

		fireEvent.keyDown(alpha, { key: 'Home' })

		expect(alpha).toHaveAttribute('aria-valuetext', '0%')
	})

	it('changes the alpha and keeps the hue on a key step', () => {
		const { alpha, onValueChange } = setup()

		fireEvent.keyDown(alpha, { key: 'End' })

		expect(onValueChange).toHaveBeenLastCalledWith(expect.objectContaining({ h: 180, a: 1 }))
	})

	it('sets the alpha from the press position on the track', () => {
		const { alpha } = setup()

		giveRect(alpha)

		fireEvent.pointerDown(alpha, { button: 0, pointerId: 1, clientX: (WIDTH * 3) / 4 })

		expect(alpha).toHaveAttribute('aria-valuenow', '0.75')
	})
})

describe('ColorSlider (disabled)', () => {
	it('leaves the tab order, marks itself disabled, and ignores keys', () => {
		const { hue, alpha, onValueChange } = setup(start, true)

		for (const slider of [hue, alpha]) {
			expect(slider).toHaveAttribute('tabindex', '-1')

			expect(slider).toHaveAttribute('aria-disabled', 'true')

			fireEvent.keyDown(slider, { key: 'End' })
		}

		expect(hue).toHaveAttribute('aria-valuenow', '180')

		expect(alpha).toHaveAttribute('aria-valuenow', '0.5')

		expect(onValueChange).not.toHaveBeenCalled()
	})
})

describe('ColorSlider (thumb)', () => {
	it('places the thumb at the fraction of the range that the value holds', () => {
		const { hue, alpha } = setup({ h: 90, s: 50, v: 50, a: 0.25 })

		expect(getSlot(hue, 'color-slider-thumb').style.left).toBe('25%')

		expect(getSlot(alpha, 'color-slider-thumb').style.left).toBe('25%')
	})
})
