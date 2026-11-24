import { describe, expect, it } from 'vitest'
import { ColorPicker } from '../../../components/color'
import { bySlot, present, renderUI } from '../../helpers'

/**
 * The trigger of a ColorPicker fills its parent, as each other control does.
 * In a parent that is narrower than its content, it keeps inside the parent.
 */

function trigger(container: HTMLElement) {
	const frame = present(bySlot(container, 'control-frame'), 'the control frame')

	return frame.getBoundingClientRect().width
}

describe('ColorPicker trigger width', () => {
	it('fills a wide parent', () => {
		const { container } = renderUI(
			<div style={{ width: 600 }}>
				<ColorPicker aria-label="Color" defaultValue="#8b5cf6" />
			</div>,
		)

		expect(trigger(container)).toBe(600)
	})

	it('fills a flex column', () => {
		const { container } = renderUI(
			<div className="flex flex-col" style={{ width: 600 }}>
				<ColorPicker aria-label="Color" defaultValue="#8b5cf6" />
			</div>,
		)

		expect(trigger(container)).toBe(600)
	})

	it('keeps inside a parent that is narrower than its content', () => {
		const { container } = renderUI(
			<div style={{ width: 60 }}>
				<ColorPicker aria-label="Color" defaultValue="#8b5cf6" />
			</div>,
		)

		expect(trigger(container)).toBeLessThanOrEqual(60)
	})
})
