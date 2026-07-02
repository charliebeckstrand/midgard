import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Calendar, type CalendarHandle, CalendarSkeleton } from '../../components/calendar'
import { Form } from '../../components/form'
import { act, bySlot, liveRegion, renderUI, screen, userEvent } from '../helpers'

const selectedDay = () =>
	screen.getAllByRole('option').find((o) => o.getAttribute('aria-selected') === 'true')

describe('Calendar', () => {
	it('pairs with an explicit CalendarSkeleton in loading trees', () => {
		const { container } = renderUI(<CalendarSkeleton />)

		expect(bySlot(container, 'calendar')).not.toBeInTheDocument()

		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})

	it('renders navigation buttons, weekday labels, and day buttons in a listbox', () => {
		const { container } = renderUI(<Calendar />)

		expect(screen.getByLabelText('Previous month')).toBeInTheDocument()

		expect(screen.getByLabelText('Next month')).toBeInTheDocument()

		const el = bySlot(container, 'calendar')

		expect(el?.textContent).toContain('Su')

		expect(el?.textContent).toContain('Mo')

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

	it('announces the new month through the polite live region on navigation', async () => {
		const user = userEvent.setup()

		renderUI(<Calendar defaultValue={new Date(2025, 5, 15)} />)

		// Lazily created on first announce; absent means nothing was announced on mount.
		expect(liveRegion()?.textContent ?? '').toBe('')

		await user.click(screen.getByLabelText('Next month'))

		expect(liveRegion()).toHaveTextContent('July 2025')
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

		expect(disabledDay, 'a day labeled 5 to be present').toBeDefined()

		await user.click(disabledDay as HTMLElement)

		expect(onChange).not.toHaveBeenCalled()
	})

	// Regression: the bare `Date(year, month, day)` constructor maps years 0–99
	// to 1900–1999. A year-1 value seeded a January 1901 view, and selections
	// came back as 1901.
	it('keeps a year below 100 through the view seed and day selection', async () => {
		const onChange = vi.fn()

		const yearOne = new Date(2000, 0, 15)

		yearOne.setFullYear(1)

		renderUI(<Calendar defaultValue={yearOne} onValueChange={onChange} />)

		const user = userEvent.setup()

		const dayButton = screen.getAllByRole('option').find((b) => b.textContent === '20')

		expect(dayButton).toBeDefined()

		await user.click(dayButton as HTMLElement)

		const selected = onChange.mock.calls[0]?.[0] as Date

		expect([selected.getFullYear(), selected.getMonth(), selected.getDate()]).toEqual([1, 0, 20])
	})

	it('marks header zone buttons as active when active.zone is "header"', () => {
		const defaultValue = new Date(2025, 5, 15)

		renderUI(<Calendar defaultValue={defaultValue} active={{ zone: 'header', index: 1 }} />)

		// index 1 is the center picker trigger; `k.day.active` (focus.virtual)
		// paints its `outline-blue-600` ring. index 0 (Previous month) must stay bare.
		expect(screen.getByRole('button', { name: /June 2025/ })).toHaveClass('outline-blue-600')

		expect(screen.getByLabelText('Previous month')).not.toHaveClass('outline-blue-600')
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

// Keyboard nav: roving focus through the day grid (WAI-ARIA grid pattern),
// grid<->header transitions, and Enter/Space activation. June 2025 starts on a
// Sunday; its days fill a clean 7-column grid and option[i] is day i+1.
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
	// focus. Roving skips them; arrow navigation must not trap at range edges (WCAG 2.1.1).
	function renderMinTenth() {
		// June 2025 begins on a Sunday; `min` on the 10th disables June 1-9, so the
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

describe('Calendar + Form', () => {
	it('seeds the selected day from Form.defaultValues', () => {
		renderUI(
			<Form defaultValues={{ date: new Date(2025, 5, 15) }}>
				<Calendar name="date" />
			</Form>,
		)

		expect(selectedDay()?.textContent).toBe('15')
	})

	it('writes the picked day back to the bound field on submit', async () => {
		const onSubmit = vi.fn()

		renderUI(
			<Form defaultValues={{ date: new Date(2025, 5, 15) }} onSubmit={onSubmit}>
				<Calendar name="date" />
				<button type="submit">Submit</button>
			</Form>,
		)

		const user = userEvent.setup()

		const day20 = screen.getAllByRole('option').find((o) => o.textContent === '20')

		await user.click(day20 as HTMLElement)

		await user.click(screen.getByRole('button', { name: 'Submit' }))

		const submitted = onSubmit.mock.calls[0]?.[0].date as Date

		expect(submitted.getFullYear()).toBe(2025)

		expect(submitted.getMonth()).toBe(5)

		expect(submitted.getDate()).toBe(20)
	})

	it('lets an explicit value prop override the bound field', () => {
		renderUI(
			<Form defaultValues={{ date: new Date(2025, 5, 15) }}>
				<Calendar name="date" value={new Date(2025, 5, 20)} onValueChange={() => {}} />
			</Form>,
		)

		expect(selectedDay()?.textContent).toBe('20')
	})
})
