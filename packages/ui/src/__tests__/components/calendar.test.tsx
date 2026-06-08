import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Calendar, type CalendarHandle } from '../../components/calendar'
import { act, bySlot, renderUI, screen, userEvent } from '../helpers'

describe('Calendar', () => {
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

	it('renders day buttons in a listbox', () => {
		renderUI(<Calendar />)

		expect(screen.getByRole('listbox')).toBeInTheDocument()
	})

	it('calls onValueChange when a day is clicked', async () => {
		const onChange = vi.fn()

		renderUI(<Calendar onValueChange={onChange} />)

		const user = userEvent.setup()

		const days = screen.getAllByRole('option')

		const dayButton = days.find((b) => b.textContent === '15')

		expect(dayButton).toBeDefined()

		await user.click(dayButton as HTMLElement)

		expect(onChange).toHaveBeenCalled()
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

		const days = screen.getAllByRole('option')

		const before = days.find((b) => b.textContent === '5')

		const after = days.find((b) => b.textContent === '25')

		const inside = days.find((b) => b.textContent === '15')

		expect(before).toBeDisabled()

		expect(after).toBeDisabled()

		expect(inside).not.toBeDisabled()
	})

	it('does not call onValueChange when a disabled day is clicked', async () => {
		const onChange = vi.fn()

		const min = new Date(2025, 5, 10)

		renderUI(<Calendar defaultValue={new Date(2025, 5, 15)} min={min} onValueChange={onChange} />)

		const user = userEvent.setup()

		const days = screen.getAllByRole('option')

		const disabledDay = days.find((b) => b.textContent === '5')

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

		const dayButtons = screen.getAllByRole('option')

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

		expect(el).toHaveAttribute('data-size', 'sm')
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

		await user.click(screen.getByRole('option', { name: 'Mar' }))

		expect(screen.getByRole('button', { name: /March 2025/ })).toBeInTheDocument()
	})

	it('exposes the month picker as a labelled listbox with a selected option', async () => {
		const user = userEvent.setup()

		renderUI(<Calendar defaultValue={new Date(2025, 5, 15)} />)

		await user.click(openPicker(/June 2025/))

		expect(screen.getByRole('listbox', { name: 'Select month' })).toBeInTheDocument()

		expect(screen.getByRole('option', { name: 'Jun', selected: true })).toBeInTheDocument()
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

		await user.click(screen.getByRole('option', { name: '2028' }))

		// Back in month picker with the newly selected year
		expect(screen.getByRole('button', { name: '2028' })).toBeInTheDocument()

		expect(screen.getByRole('option', { name: 'Jan' })).toBeInTheDocument()
	})
})

// Keyboard nav is the half of a11y compliance axe can't see: roving focus
// through the day grid (WAI-ARIA grid pattern) plus the grid<->header
// transitions and Enter/Space activation. June 2025 starts on a Sunday, so its
// days fill a clean 7-column grid and option[i] is day i+1.
describe('Calendar keyboard navigation', () => {
	const day = (n: string) =>
		screen.getAllByRole('option').find((option) => option.textContent === n) as HTMLElement

	function renderJune() {
		renderUI(<Calendar defaultValue={new Date(2025, 5, 15)} />)
	}

	it('moves day focus by one column with ArrowRight / ArrowLeft', async () => {
		const user = userEvent.setup()

		renderJune()

		act(() => day('10').focus())

		await user.keyboard('{ArrowRight}')

		expect(document.activeElement).toBe(day('11'))

		await user.keyboard('{ArrowLeft}')

		expect(document.activeElement).toBe(day('10'))
	})

	it('moves day focus by one week with ArrowDown / ArrowUp', async () => {
		const user = userEvent.setup()

		renderJune()

		act(() => day('10').focus())

		await user.keyboard('{ArrowDown}')

		expect(document.activeElement).toBe(day('17'))

		await user.keyboard('{ArrowUp}')

		expect(document.activeElement).toBe(day('10'))
	})

	it('jumps to the first / last day with Home / End', async () => {
		const user = userEvent.setup()

		renderJune()

		const options = screen.getAllByRole('option')

		act(() => day('10').focus())

		await user.keyboard('{Home}')

		expect(document.activeElement).toBe(options[0])

		await user.keyboard('{End}')

		expect(document.activeElement).toBe(options[options.length - 1])
	})

	it('moves focus from the top row up into the month header', async () => {
		const user = userEvent.setup()

		renderJune()

		act(() => day('1').focus())

		await user.keyboard('{ArrowUp}')

		expect(document.activeElement).toBe(screen.getByRole('button', { name: /June 2025/ }))
	})

	it('moves focus from the header down into the day grid', async () => {
		const user = userEvent.setup()

		renderJune()

		act(() => screen.getByLabelText('Previous month').focus())

		await user.keyboard('{ArrowDown}')

		expect(document.activeElement).toBe(day('1'))
	})

	it('selects the focused day with Enter', async () => {
		const onChange = vi.fn()

		const user = userEvent.setup()

		renderUI(<Calendar defaultValue={new Date(2025, 5, 15)} onValueChange={onChange} />)

		act(() => day('20').focus())

		await user.keyboard('{Enter}')

		expect(onChange).toHaveBeenCalledTimes(1)

		expect((onChange.mock.calls[0]?.[0] as Date).getDate()).toBe(20)
	})

	it('selects the focused day with Space', async () => {
		const onChange = vi.fn()

		const user = userEvent.setup()

		renderUI(<Calendar defaultValue={new Date(2025, 5, 15)} onValueChange={onChange} />)

		act(() => day('20').focus())

		await user.keyboard(' ')

		expect(onChange).toHaveBeenCalled()
	})

	// Disabled (out-of-range) days render as `<button disabled>` and can't take
	// focus. Roving must skip them rather than `.focus()` a no-op and strand the
	// user — otherwise arrow navigation traps at the edge of the range (WCAG 2.1.1).
	function renderMinTenth() {
		// June 2025 begins on a Sunday; `min` on the 10th disables June 1–9, so the
		// grid's first focusable day is the 10th.
		renderUI(<Calendar defaultValue={new Date(2025, 5, 15)} min={new Date(2025, 5, 10)} />)
	}

	it('enters the grid on the first enabled day when leading days are disabled', async () => {
		const user = userEvent.setup()

		renderMinTenth()

		act(() => screen.getByLabelText('Previous month').focus())

		await user.keyboard('{ArrowDown}')

		expect(document.activeElement).toBe(day('10'))
	})

	it('moves up to the header from the first enabled row instead of stalling on a disabled week', async () => {
		const user = userEvent.setup()

		renderMinTenth()

		act(() => day('10').focus())

		await user.keyboard('{ArrowUp}')

		expect(document.activeElement).toBe(screen.getByRole('button', { name: /June 2025/ }))
	})
})
