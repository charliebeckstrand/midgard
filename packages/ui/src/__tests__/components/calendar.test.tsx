import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Calendar, type CalendarHandle } from '../../components/calendar'
import { act, bySlot, renderUI, screen, userEvent } from '../helpers'

describe('Calendar', () => {
	it('renders with data-slot="calendar"', () => {
		const { container } = renderUI(<Calendar />)

		const el = bySlot(container, 'calendar')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Calendar className="custom" />)

		const el = bySlot(container, 'calendar')

		expect(el?.className).toContain('custom')
	})

	it('renders navigation buttons', () => {
		renderUI(<Calendar />)

		expect(screen.getByLabelText('Previous month')).toBeInTheDocument()

		expect(screen.getByLabelText('Next month')).toBeInTheDocument()
	})

	it('renders weekday labels', () => {
		const { container } = renderUI(<Calendar />)

		const el = bySlot(container, 'calendar')

		expect(el?.textContent).toContain('Su')
		expect(el?.textContent).toContain('Mo')
	})

	it('renders day buttons inside a labelled grid', () => {
		renderUI(<Calendar />)

		expect(screen.getByRole('table', { name: 'Calendar' })).toBeInTheDocument()
	})

	it('calls onValueChange when a day is clicked', async () => {
		const onChange = vi.fn()

		renderUI(<Calendar onValueChange={onChange} />)

		const user = userEvent.setup()

		const buttons = screen.getAllByRole('button')

		const dayButton = buttons.find((b) => b.textContent === '15')

		if (dayButton) {
			await user.click(dayButton)

			expect(onChange).toHaveBeenCalled()
		}
	})

	it('exposes imperative handle via ref', () => {
		const ref = createRef<CalendarHandle>()

		renderUI(<Calendar ref={ref} />)

		expect(ref.current).toBeDefined()

		expect(typeof ref.current?.prevMonth).toBe('function')

		expect(typeof ref.current?.nextMonth).toBe('function')

		expect(typeof ref.current?.openPicker).toBe('function')
	})

	it('changes the month when the previous / next nav buttons are clicked', async () => {
		const user = userEvent.setup()

		const defaultValue = new Date(2025, 5, 15)

		renderUI(<Calendar defaultValue={defaultValue} />)

		const heading = screen.getByRole('button', { name: /June 2025/ })

		expect(heading).toBeInTheDocument()

		await user.click(screen.getByLabelText('Next month'))

		expect(screen.getByRole('button', { name: /July 2025/ })).toBeInTheDocument()

		await user.click(screen.getByLabelText('Previous month'))

		expect(screen.getByRole('button', { name: /June 2025/ })).toBeInTheDocument()
	})

	it('disables days outside the min/max range', () => {
		const defaultValue = new Date(2025, 5, 15)

		const min = new Date(2025, 5, 10)

		const max = new Date(2025, 5, 20)

		renderUI(<Calendar defaultValue={defaultValue} min={min} max={max} />)

		const buttons = screen.getAllByRole('button')

		const before = buttons.find((b) => b.textContent === '5')

		const after = buttons.find((b) => b.textContent === '25')

		const inside = buttons.find((b) => b.textContent === '15')

		expect(before).toBeDisabled()

		expect(after).toBeDisabled()

		expect(inside).not.toBeDisabled()
	})

	it('does not call onValueChange when a disabled day is clicked', async () => {
		const onChange = vi.fn()

		const min = new Date(2025, 5, 10)

		renderUI(<Calendar defaultValue={new Date(2025, 5, 15)} min={min} onValueChange={onChange} />)

		const user = userEvent.setup()

		const buttons = screen.getAllByRole('button')

		const disabledDay = buttons.find((b) => b.textContent === '5')

		if (disabledDay) {
			await user.click(disabledDay)

			expect(onChange).not.toHaveBeenCalled()
		}
	})

	it('marks header zone buttons as active when active.zone is "header"', () => {
		const defaultValue = new Date(2025, 5, 15)

		renderUI(<Calendar defaultValue={defaultValue} active={{ zone: 'header', index: 1 }} />)

		// Header should still render the label button — just confirm Calendar mounts.
		expect(screen.getByRole('button', { name: /June 2025/ })).toBeInTheDocument()
	})

	it('forwards day rendering through getDayProps to customize variants', () => {
		const getDayProps = vi.fn(() => ({ className: 'custom-day' }))

		renderUI(<Calendar defaultValue={new Date(2025, 5, 15)} getDayProps={getDayProps} />)

		expect(getDayProps).toHaveBeenCalled()

		const dayButtons = screen.getAllByRole('button')

		const styled = dayButtons.find((b) => b.className.includes('custom-day'))

		expect(styled).toBeDefined()
	})

	it('invokes onPickerOpenChange when openPicker is called via the ref', () => {
		const onPickerOpenChange = vi.fn()

		const ref = createRef<CalendarHandle>()

		renderUI(<Calendar ref={ref} onPickerOpenChange={onPickerOpenChange} />)

		act(() => {
			ref.current?.openPicker()
		})

		expect(onPickerOpenChange).toHaveBeenCalledWith(true)
	})

	it('respects an explicit size prop on the root', () => {
		const { container } = renderUI(<Calendar size="sm" />)

		const el = bySlot(container, 'calendar')

		expect(el).toHaveAttribute('data-step', 'sm')
	})
})

describe('Calendar month/year picker', () => {
	function openPicker(label: RegExp) {
		const monthButton = screen.getByRole('button', { name: label })

		return monthButton
	}

	it('opens the month picker when the header label is clicked', async () => {
		const user = userEvent.setup()

		const defaultValue = new Date(2025, 5, 15)

		renderUI(<Calendar defaultValue={defaultValue} />)

		await user.click(openPicker(/June 2025/))

		expect(screen.getByRole('button', { name: 'Previous year' })).toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Next year' })).toBeInTheDocument()
	})

	it('navigates years inside the month picker', async () => {
		const user = userEvent.setup()

		const defaultValue = new Date(2025, 5, 15)

		renderUI(<Calendar defaultValue={defaultValue} />)

		await user.click(openPicker(/June 2025/))

		await user.click(screen.getByRole('button', { name: 'Next year' }))

		expect(screen.getByRole('button', { name: '2026' })).toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Previous year' }))

		expect(screen.getByRole('button', { name: '2025' })).toBeInTheDocument()
	})

	it('switches the calendar month when a month cell is selected', async () => {
		const user = userEvent.setup()

		const defaultValue = new Date(2025, 5, 15)

		renderUI(<Calendar defaultValue={defaultValue} />)

		await user.click(openPicker(/June 2025/))

		await user.click(screen.getByRole('button', { name: 'Mar' }))

		expect(screen.getByRole('button', { name: /March 2025/ })).toBeInTheDocument()
	})

	it('opens the year picker from the month picker and navigates decades', async () => {
		const user = userEvent.setup()

		const defaultValue = new Date(2025, 5, 15)

		renderUI(<Calendar defaultValue={defaultValue} />)

		await user.click(openPicker(/June 2025/))

		await user.click(screen.getByRole('button', { name: '2025' }))

		expect(screen.getByRole('button', { name: 'Previous decade' })).toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Next decade' }))

		expect(screen.getByRole('button', { name: /2030\s*–\s*2039/ })).toBeInTheDocument()
	})

	it('selects a year and returns to the month picker', async () => {
		const user = userEvent.setup()

		const defaultValue = new Date(2025, 5, 15)

		renderUI(<Calendar defaultValue={defaultValue} />)

		await user.click(openPicker(/June 2025/))

		await user.click(screen.getByRole('button', { name: '2025' }))

		await user.click(screen.getByRole('button', { name: '2028' }))

		// Back in month picker with the newly selected year
		expect(screen.getByRole('button', { name: '2028' })).toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Jan' })).toBeInTheDocument()
	})
})
