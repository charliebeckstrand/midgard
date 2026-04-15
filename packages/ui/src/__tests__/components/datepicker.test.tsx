import { describe, expect, it } from 'vitest'
import { DatePicker } from '../../components/datepicker'
import { bySlot, renderUI } from '../helpers'

describe('DatePicker', () => {
	it('renders with data-slot="control"', () => {
		const { container } = renderUI(<DatePicker />)

		const el = bySlot(container, 'control')

		expect(el).toBeInTheDocument()
	})

	it('renders trigger button', () => {
		const { container } = renderUI(<DatePicker />)

		const button = bySlot(container, 'datepicker-button')

		expect(button).toBeInTheDocument()

		expect(button?.tagName).toBe('BUTTON')
	})

	it('shows placeholder text', () => {
		const { container } = renderUI(<DatePicker placeholder="Pick a date" />)

		expect(container.textContent).toContain('Pick a date')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<DatePicker className="custom" />)

		const el = bySlot(container, 'control')

		expect(el?.className).toContain('custom')
	})

	it('disables trigger when disabled', () => {
		const { container } = renderUI(<DatePicker disabled />)

		const button = bySlot(container, 'datepicker-button')

		expect(button).toBeDisabled()
	})

	it('displays formatted date when value is set', () => {
		const date = new Date(2025, 0, 15)

		const { container } = renderUI(<DatePicker value={date} />)

		expect(container.textContent).toContain('1/15/2025')
	})
})
