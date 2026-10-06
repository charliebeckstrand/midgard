import { describe, expect, it } from 'vitest'
import { ColorPicker } from '../../../components/color'
import { bySlot, present, renderUI } from '../../helpers'

/**
 * The trigger of a ColorPicker is as wide as its swatch and its color value.
 * It does not fill a wide parent. In a parent that is narrower than its
 * content, it keeps inside the parent.
 */

function trigger(container: HTMLElement) {
	const frame = present(bySlot(container, 'control-frame'), 'the control frame')

	return frame.getBoundingClientRect().width
}

describe('ColorPicker trigger width', () => {
	it('is as wide as its content in a wide parent', () => {
		const { container } = renderUI(
			<div style={{ width: 600 }}>
				<ColorPicker aria-label="Color" defaultValue="#8b5cf6" />
			</div>,
		)

		const value = present(
			bySlot(container, 'color-picker-button')?.lastElementChild,
			'the color value',
		) as HTMLElement

		expect(trigger(container)).toBeLessThan(200)

		// The value shows in full, so the trigger does not cut its content.
		expect(value.scrollWidth).toBeLessThanOrEqual(value.clientWidth)
	})

	it('keeps inside a parent that is narrower than its content', () => {
		const { container } = renderUI(
			<div style={{ width: 60 }}>
				<ColorPicker aria-label="Color" defaultValue="#8b5cf6" />
			</div>,
		)

		expect(trigger(container)).toBeLessThanOrEqual(60)
	})

	it('fills the parent with a `w-full` class', () => {
		const { container } = renderUI(
			<div style={{ width: 600 }}>
				<ColorPicker aria-label="Color" defaultValue="#8b5cf6" className="w-full" />
			</div>,
		)

		expect(trigger(container)).toBe(600)
	})
})
