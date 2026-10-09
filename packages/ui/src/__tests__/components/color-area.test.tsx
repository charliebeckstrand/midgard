import { describe, expect, it, vi } from 'vitest'
import { ColorPanel } from '../../components/color'
import type { Hsva } from '../../components/color/types'
import { Fieldset } from '../../components/fieldset'
import { fireEvent, getSlot, renderUI } from '../helpers'

const start: Hsva = { h: 120, s: 50, v: 50, a: 1 }

function setup(initial: Hsva = start, disabled = false) {
	const onValueChange = vi.fn<(value: Hsva) => void>()

	const { container } = renderUI(
		<ColorPanel
			disabled={disabled}
			format="hsva"
			defaultValue={initial}
			onValueChange={onValueChange}
		/>,
	)

	const area = getSlot(container, 'color-area')

	const brightness = () =>
		Number(/brightness (\d+)%/.exec(area.getAttribute('aria-valuetext') ?? '')?.[1])

	return { area, brightness, onValueChange }
}

describe('ColorArea', () => {
	it('announces both axes and paints the base in the current hue', () => {
		const { area } = setup()

		expect(area).toHaveAttribute('aria-valuenow', '50')

		expect(area).toHaveAttribute('aria-valuetext', 'Saturation 50%, brightness 50%')

		expect(area.style.backgroundColor).not.toBe('')
	})

	it('moves saturation on the horizontal arrows and brightness on the vertical arrows', () => {
		const { area, brightness } = setup()

		fireEvent.keyDown(area, { key: 'ArrowRight' })

		expect(area).toHaveAttribute('aria-valuenow', '51')

		fireEvent.keyDown(area, { key: 'ArrowLeft' })

		expect(area).toHaveAttribute('aria-valuenow', '50')

		fireEvent.keyDown(area, { key: 'ArrowUp' })

		expect(brightness()).toBe(51)

		fireEvent.keyDown(area, { key: 'ArrowDown' })

		expect(brightness()).toBe(50)
	})

	it('takes a step of 10 with Shift', () => {
		const { area, brightness } = setup()

		fireEvent.keyDown(area, { key: 'ArrowRight', shiftKey: true })

		expect(area).toHaveAttribute('aria-valuenow', '60')

		fireEvent.keyDown(area, { key: 'ArrowDown', shiftKey: true })

		expect(brightness()).toBe(40)
	})

	it('clamps both axes to 0-100', () => {
		const { area, brightness } = setup({ h: 120, s: 100, v: 95, a: 1 })

		fireEvent.keyDown(area, { key: 'ArrowRight', shiftKey: true })

		expect(area).toHaveAttribute('aria-valuenow', '100')

		fireEvent.keyDown(area, { key: 'PageUp' })

		expect(brightness()).toBe(100)

		fireEvent.keyDown(area, { key: 'Home' })

		fireEvent.keyDown(area, { key: 'ArrowLeft' })

		expect(area).toHaveAttribute('aria-valuenow', '0')

		fireEvent.keyDown(area, { key: 'PageDown' })

		expect(brightness()).toBe(90)
	})

	it('keeps the hue and emits the new saturation and brightness', () => {
		const { area, onValueChange } = setup()

		fireEvent.keyDown(area, { key: 'End' })

		expect(onValueChange).toHaveBeenLastCalledWith({ h: 120, s: 100, v: 50, a: 1 })
	})

	it('leaves an unbound key to the page', () => {
		const { area, onValueChange } = setup()

		// `fireEvent` returns false only when a handler prevents the default.
		expect(fireEvent.keyDown(area, { key: 'a' })).toBe(true)

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('sets saturation from x and brightness from the inverted y of the press', () => {
		const { area, brightness } = setup()

		area.getBoundingClientRect = () => DOMRect.fromRect({ width: 200, height: 100 })

		fireEvent.pointerDown(area, {
			isPrimary: true,
			button: 0,
			pointerId: 1,
			clientX: 50,
			clientY: 25,
		})

		expect(area).toHaveAttribute('aria-valuenow', '25')

		expect(brightness()).toBe(75)
	})

	it('places the thumb at the saturation and the inverted brightness', () => {
		const { area } = setup({ h: 0, s: 30, v: 80, a: 1 })

		const thumb = getSlot(area, 'color-area-thumb')

		expect(thumb.style.left).toBe('30%')

		expect(thumb.style.top).toBe('20%')
	})

	// A disabled `<fieldset>` disables only its native controls, and the area is a
	// `<div>`. The Form uses the fieldset as its lock while it submits.
	it('ignores keys and presses under a disabled fieldset', () => {
		const onValueChange = vi.fn<(value: Hsva) => void>()

		const { container } = renderUI(
			<Fieldset disabled>
				<ColorPanel format="hsva" defaultValue={start} onValueChange={onValueChange} />
			</Fieldset>,
		)

		const area = getSlot(container, 'color-area')

		area.getBoundingClientRect = () => DOMRect.fromRect({ width: 200, height: 100 })

		fireEvent.keyDown(area, { key: 'End' })

		expect(area).toHaveAttribute('aria-valuenow', '50')

		fireEvent.pointerDown(area, {
			isPrimary: true,
			button: 0,
			pointerId: 1,
			clientX: 50,
			clientY: 25,
		})

		expect(area).toHaveAttribute('aria-valuenow', '50')

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('leaves the tab order, marks itself disabled, and ignores keys', () => {
		const { area, onValueChange } = setup(start, true)

		expect(area).toHaveAttribute('tabindex', '-1')

		expect(area).toHaveAttribute('aria-disabled', 'true')

		fireEvent.keyDown(area, { key: 'End' })

		expect(area).toHaveAttribute('aria-valuenow', '50')

		expect(onValueChange).not.toHaveBeenCalled()
	})
})
