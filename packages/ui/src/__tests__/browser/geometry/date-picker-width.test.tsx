import { describe, expect, it } from 'vitest'
import { DatePicker } from '../../../components/date-picker'
import { bySlot, present, renderUI } from '../../helpers'

/**
 * The trigger of a DatePicker is as wide as its value and its calendar icon.
 * It does not fill a wide parent. In a parent that is narrower than its
 * content, it keeps inside the parent. The `input` mode is a DateInput, which
 * fills its parent as an Input does.
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
	])('is as wide as %s in a wide parent', (_, picker) => {
		const { container } = renderUI(<div style={{ width: 600 }}>{picker}</div>)

		const value = present(
			bySlot(container, 'datepicker-button')?.firstElementChild,
			'the value',
		) as HTMLElement

		expect(frame(container)).toBeLessThan(300)

		// The value shows in full, so the trigger does not cut its content.
		expect(value.scrollWidth).toBeLessThanOrEqual(value.clientWidth)
	})

	it('is as wide as its content in a flex column', () => {
		const { container } = renderUI(
			<div className="flex flex-col" style={{ width: 600 }}>
				<DatePicker aria-label="Date" defaultValue={date} />
			</div>,
		)

		expect(frame(container)).toBeLessThan(300)
	})

	it('keeps inside a parent that is narrower than its content', () => {
		const { container } = renderUI(
			<div style={{ width: 80 }}>
				<DatePicker aria-label="Date" defaultValue={date} />
			</div>,
		)

		expect(frame(container)).toBeLessThanOrEqual(80)
	})

	it('fills the parent with a `w-full` class', () => {
		const { container } = renderUI(
			<div style={{ width: 600 }}>
				<DatePicker aria-label="Date" defaultValue={date} className="w-full" />
			</div>,
		)

		expect(frame(container)).toBe(600)
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
