import { describe, expect, it } from 'vitest'
import { DatePicker } from '../../../components/date-picker'
import { bySlot, present, renderUI } from '../../helpers'

/**
 * The trigger of a DatePicker fills its parent, as each other control does. In
 * a parent that is narrower than its content, it keeps inside the parent. The
 * `input` mode is a DateInput, which also fills its parent.
 */

const date = new Date(2026, 5, 15)

function frame(container: HTMLElement) {
	return present(bySlot(container, 'control-frame'), 'the control frame').getBoundingClientRect()
		.width
}

describe('DatePicker trigger width', () => {
	it.each([
		['the placeholder', <DatePicker key="placeholder" aria-label="Date" />],
		['a date', <DatePicker key="date" aria-label="Date" defaultValue={date} />],
		[
			'a range',
			<DatePicker
				key="range"
				aria-label="Dates"
				range
				defaultValue={[date, new Date(2026, 5, 22)]}
			/>,
		],
		['the relative placeholder', <DatePicker key="relative" aria-label="Period" relative />],
	])('fills a wide parent with %s', (_, picker) => {
		const { container } = renderUI(<div style={{ width: 600 }}>{picker}</div>)

		expect(frame(container)).toBe(600)
	})

	it('fills a flex column', () => {
		const { container } = renderUI(
			<div className="flex flex-col" style={{ width: 600 }}>
				<DatePicker aria-label="Date" defaultValue={date} />
			</div>,
		)

		expect(frame(container)).toBe(600)
	})

	it('keeps inside a parent that is narrower than its content', () => {
		const { container } = renderUI(
			<div style={{ width: 80 }}>
				<DatePicker aria-label="Date" defaultValue={date} />
			</div>,
		)

		expect(frame(container)).toBeLessThanOrEqual(80)
	})

	it('fills the parent in `input` mode', () => {
		const { container } = renderUI(
			<div style={{ width: 600 }}>
				<DatePicker aria-label="Date" input defaultValue={date} />
			</div>,
		)

		expect(frame(container)).toBe(600)
	})
})
