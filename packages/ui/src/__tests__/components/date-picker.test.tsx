import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Control } from '../../components/control'
import { DatePicker } from '../../components/date-picker'
import { useDatePickerState } from '../../components/date-picker/use-date-picker-state'
import { act, bySlot, renderUI, screen, userEvent, waitFor } from '../helpers'

function findDay(day: number) {
	const days = screen.getAllByRole('option')

	return days.find((b) => b.textContent?.trim() === String(day))
}

type DatePickerApi = ReturnType<typeof useDatePickerState>

// Drives the close path with an explicit floating-ui reason via a real React ref,
// which populates the reference node the focus effect reads.
function CloseReasonHarness({ apiRef }: { apiRef: { current: DatePickerApi | null } }) {
	const state = useDatePickerState({})

	apiRef.current = state

	return (
		<div ref={state.setReference}>
			<button type="button" data-slot="harness-trigger">
				Trigger
			</button>
		</div>
	)
}

// Controlled usage: the parent holds `Date | undefined` and clears by passing
// `value={undefined}` back. Asserts the field stays controlled on clear and
// does not resurface the stale value.
function ControlledDatePicker() {
	const [date, setDate] = useState<Date | undefined>(undefined)

	return <DatePicker value={date} onValueChange={setDate} />
}

describe('DatePicker', () => {
	it('names the trigger via aria-label for unwrapped pickers', () => {
		renderUI(<DatePicker aria-label="Due date" />)

		expect(screen.getByRole('button', { name: 'Due date' })).toBeInTheDocument()
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

	it('disables trigger when disabled', () => {
		const { container } = renderUI(<DatePicker disabled />)

		const button = bySlot(container, 'datepicker-button')

		expect(button).toBeDisabled()
	})

	it('surfaces invalid state from an enclosing Control', () => {
		const { container } = renderUI(
			<Control invalid>
				<DatePicker />
			</Control>,
		)

		const button = bySlot(container, 'datepicker-button')

		expect(button).toHaveAttribute('data-invalid')

		expect(button).toHaveAttribute('aria-invalid', 'true')
	})

	it('inherits disabled from an enclosing Control', () => {
		const { container } = renderUI(
			<Control disabled>
				<DatePicker />
			</Control>,
		)

		expect(bySlot(container, 'datepicker-button')).toBeDisabled()
	})

	it('surfaces required state from an enclosing Control', () => {
		const { container } = renderUI(
			<Control required>
				<DatePicker />
			</Control>,
		)

		expect(bySlot(container, 'datepicker-button')).toHaveAttribute('aria-required', 'true')
	})

	it('displays formatted date when value is set', () => {
		const date = new Date(2025, 0, 15)

		const { container } = renderUI(<DatePicker value={date} />)

		expect(container.textContent).toContain('1/15/2025')
	})

	it('opens the calendar content when the trigger is clicked', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(<DatePicker />)

		const button = bySlot(container, 'datepicker-button') as HTMLButtonElement

		await user.click(button)

		expect(bySlot(container, 'datepicker-content')).toBeInTheDocument()

		expect(button).toHaveAttribute('aria-expanded', 'true')
	})

	it('closes the calendar when the trigger is clicked again', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(<DatePicker />)

		const button = bySlot(container, 'datepicker-button') as HTMLButtonElement

		await user.click(button)

		expect(bySlot(container, 'datepicker-content')).toBeInTheDocument()

		await user.click(button)

		expect(button).toHaveAttribute('aria-expanded', 'false')
	})

	it('selects a date and calls onValueChange', async () => {
		const user = userEvent.setup()

		const onChange = vi.fn()

		const defaultValue = new Date(2025, 5, 15)

		const { container } = renderUI(
			<DatePicker defaultValue={defaultValue} onValueChange={onChange} />,
		)

		await user.click(bySlot(container, 'datepicker-button') as HTMLButtonElement)

		const day = findDay(20)

		if (!day) throw new Error('day 20 button not found')

		await user.click(day)

		expect(onChange).toHaveBeenCalled()

		const arg = onChange.mock.calls[0]?.[0] as Date

		expect(arg.getMonth()).toBe(5)
		expect(arg.getDate()).toBe(20)
	})

	it('clears the selected date when the clear footer button is pressed', async () => {
		const user = userEvent.setup()

		const onChange = vi.fn()

		const defaultValue = new Date(2025, 5, 15)

		const { container } = renderUI(
			<DatePicker defaultValue={defaultValue} onValueChange={onChange} />,
		)

		await user.click(bySlot(container, 'datepicker-button') as HTMLButtonElement)

		await user.click(screen.getByLabelText('Clear selection'))

		expect(onChange).toHaveBeenCalledWith(undefined)
	})

	it('clears a controlled value with a single click', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(<ControlledDatePicker />)

		const button = bySlot(container, 'datepicker-button') as HTMLButtonElement

		await user.click(button)

		const day = findDay(20)

		if (!day) throw new Error('day 20 button not found')

		await user.click(day)

		expect(button).not.toHaveTextContent('Select a date')

		await user.click(button)

		await user.click(screen.getByLabelText('Clear selection'))

		expect(button).toHaveTextContent('Select a date')
	})

	it('selects today via the footer Today button', async () => {
		const user = userEvent.setup()

		const onChange = vi.fn()

		const { container } = renderUI(<DatePicker onValueChange={onChange} />)

		await user.click(bySlot(container, 'datepicker-button') as HTMLButtonElement)

		await user.click(screen.getByRole('button', { name: 'Today' }))

		expect(onChange).toHaveBeenCalled()

		const arg = onChange.mock.calls[0]?.[0] as Date

		expect(arg).toBeInstanceOf(Date)
	})

	it('refocuses the trigger when closed with Escape', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(<DatePicker />)

		const button = bySlot(container, 'datepicker-button') as HTMLButtonElement

		await user.click(button)

		expect(bySlot(container, 'datepicker-content')).toBeInTheDocument()

		await user.keyboard('{Escape}')

		expect(button).toHaveAttribute('aria-expanded', 'false')

		expect(button).toHaveFocus()
	})

	it('refocuses the trigger after selecting a date', async () => {
		const user = userEvent.setup()

		const defaultValue = new Date(2025, 5, 15)

		const { container } = renderUI(<DatePicker defaultValue={defaultValue} />)

		const button = bySlot(container, 'datepicker-button') as HTMLButtonElement

		await user.click(button)

		const day = findDay(20)

		if (!day) throw new Error('day 20 button not found')

		await user.click(day)

		expect(button).toHaveAttribute('aria-expanded', 'false')

		expect(button).toHaveFocus()
	})

	it('refocuses the trigger when closed via Escape (reason-driven)', () => {
		const apiRef: { current: DatePickerApi | null } = { current: null }

		const { container } = renderUI(<CloseReasonHarness apiRef={apiRef} />)

		const trigger = bySlot(container, 'harness-trigger') as HTMLButtonElement

		act(() => apiRef.current?.onOpenChange(true))

		act(() => apiRef.current?.onOpenChange(false, undefined, 'escape-key'))

		expect(trigger).toHaveFocus()
	})

	it('does not refocus the trigger when dismissed by an outside press', () => {
		const apiRef: { current: DatePickerApi | null } = { current: null }

		const { container } = renderUI(<CloseReasonHarness apiRef={apiRef} />)

		const trigger = bySlot(container, 'harness-trigger') as HTMLButtonElement

		act(() => apiRef.current?.onOpenChange(true))

		act(() => apiRef.current?.onOpenChange(false, undefined, 'outside-press'))

		expect(trigger).not.toHaveFocus()
	})
})

// Focus stays on the trigger while an aria-activedescendant model drives the
// grid. Covers the keyboard path: opening, moving the highlight, and committing.
describe('DatePicker keyboard', () => {
	it.each([
		'{ArrowDown}',
		'{ArrowUp}',
		'{Enter}',
		' ',
	])('opens the calendar from the closed trigger with %s', async (key) => {
		const user = userEvent.setup()

		const { container } = renderUI(<DatePicker />)

		const button = bySlot(container, 'datepicker-button') as HTMLButtonElement

		button.focus()

		await user.keyboard(key)

		expect(bySlot(container, 'datepicker-content')).toBeInTheDocument()

		expect(button).toHaveAttribute('aria-expanded', 'true')
	})

	it('closes the open calendar with Escape', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(<DatePicker />)

		const button = bySlot(container, 'datepicker-button') as HTMLButtonElement

		button.focus()

		await user.keyboard('{ArrowDown}')

		expect(button).toHaveAttribute('aria-expanded', 'true')

		await user.keyboard('{Escape}')

		expect(button).toHaveAttribute('aria-expanded', 'false')
	})

	it('shows the active-day highlight while DOM focus stays on the dialog', async () => {
		const user = userEvent.setup()

		// June 2025; the initial highlight lands on the 15th.
		renderUI(<DatePicker defaultValue={new Date(2025, 5, 15)} />)

		const button = screen.getByRole('button')

		button.focus()

		await user.keyboard('{ArrowDown}') // open

		await user.keyboard('{ArrowDown}') // materialize the highlight on the 15th

		const day = findDay(15)

		expect(day).not.toHaveFocus()

		// The highlight ring must render without DOM focus; a `focus-visible:`
		// gated ring never shows under the virtual model.
		expect(day).toHaveClass('outline-2')

		// `outline-solid` must survive the merge and evict the Button reset's
		// ungated `outline-none`, which would keep the stroke invisible.
		expect(day).toHaveClass('outline-solid')

		expect(day).not.toHaveClass('outline-none')
	})

	it('keeps focus inside the dialog when an arrow move crosses months with a day cell focused', async () => {
		const user = userEvent.setup()

		renderUI(<DatePicker defaultValue={new Date(2025, 5, 15)} />)

		const button = screen.getByRole('button')

		button.focus()

		await user.keyboard('{ArrowDown}') // open

		// The modal trap lets Tab reach day cells; seat DOM focus on one.
		const day30 = findDay(30)

		act(() => day30?.focus())

		// Materialize on the 15th, then the 8th, the 1st, and May 25th; the last
		// move re-anchors the view to May and unmounts every June day button.
		await user.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}{ArrowUp}')

		expect(findDay(31)).toBeInTheDocument() // May has 31 days; the view moved

		expect(screen.getByRole('dialog', { name: 'Choose date' })).toHaveFocus()
	})

	it('keeps arrow keys inside the open month picker', async () => {
		const user = userEvent.setup()

		renderUI(<DatePicker defaultValue={new Date(2025, 5, 15)} />)

		const button = screen.getByRole('button')

		button.focus()

		await user.keyboard('{ArrowDown}') // open

		await user.click(screen.getByRole('button', { name: /June 2025/ }))

		// The picker focuses its selected cell on open.
		const jun = await screen.findByRole('option', { name: 'Jun', selected: true })

		await waitFor(() => expect(jun).toHaveFocus())

		await user.keyboard('{ArrowUp}') // second row → first row (Mar)

		await user.keyboard('{ArrowUp}') // first row → year label in the picker header

		const yearLabel = screen.getByRole('button', { name: '2025' })

		expect(yearLabel).toHaveFocus()

		// No move applies; the press must stay sealed in the picker rather than
		// drive the calendar underneath or pull focus back to the dialog.
		await user.keyboard('{ArrowUp}')

		expect(yearLabel).toHaveFocus()

		expect(screen.getByRole('listbox', { name: 'Select month' })).toBeInTheDocument()
	})

	it('moves the active day with arrows and commits it with Enter', async () => {
		const user = userEvent.setup()

		const onChange = vi.fn()

		// June 2025; the initial highlight lands on the 15th.
		renderUI(<DatePicker defaultValue={new Date(2025, 5, 15)} onValueChange={onChange} />)

		const button = screen.getByRole('button')

		button.focus()

		await user.keyboard('{ArrowDown}') // open

		await user.keyboard('{ArrowDown}') // materialize the highlight on the 15th

		await user.keyboard('{ArrowDown}') // move one week forward → the 22nd

		await user.keyboard('{Enter}') // commit

		expect(onChange).toHaveBeenCalledTimes(1)

		const committed = onChange.mock.calls[0]?.[0] as Date

		expect(committed.getMonth()).toBe(5)

		expect(committed.getDate()).toBe(22)

		expect(button).toHaveAttribute('aria-expanded', 'false')
	})
})

describe('DatePicker range', () => {
	it('names the trigger via aria-label for unwrapped pickers', () => {
		// The range variant threads aria-label through to the same trigger; the
		// placeholder is not a programmatic name.
		renderUI(<DatePicker range aria-label="Stay dates" />)

		expect(screen.getByRole('button', { name: 'Stay dates' })).toBeInTheDocument()
	})

	it('renders trigger with range placeholder', () => {
		const { container } = renderUI(<DatePicker range placeholder="Pick dates" />)

		expect(container.textContent).toContain('Pick dates')
	})

	it('disables trigger when disabled', () => {
		const { container } = renderUI(<DatePicker range disabled />)

		const button = bySlot(container, 'datepicker-button')

		expect(button).toBeDisabled()
	})

	it('surfaces invalid state from an enclosing Control', () => {
		const { container } = renderUI(
			<Control invalid>
				<DatePicker range />
			</Control>,
		)

		const button = bySlot(container, 'datepicker-button')

		expect(button).toHaveAttribute('data-invalid')

		expect(button).toHaveAttribute('aria-invalid', 'true')
	})

	it('opens the range calendar when the trigger is clicked', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(<DatePicker range />)

		const button = bySlot(container, 'datepicker-button') as HTMLButtonElement

		await user.click(button)

		expect(bySlot(container, 'datepicker-content')).toBeInTheDocument()
	})

	it('displays formatted range when value is set', () => {
		const start = new Date(2025, 0, 1)
		const end = new Date(2025, 0, 10)

		const { container } = renderUI(<DatePicker range value={[start, end]} />)

		expect(container.textContent).toContain('1/1/2025')
	})

	it('closes the range calendar when the trigger is clicked again', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(<DatePicker range />)

		const button = bySlot(container, 'datepicker-button') as HTMLButtonElement

		await user.click(button)

		expect(button).toHaveAttribute('aria-expanded', 'true')

		await user.click(button)

		expect(button).toHaveAttribute('aria-expanded', 'false')
	})

	it('exposes the clear footer button when a range is set', async () => {
		const user = userEvent.setup()

		const defaultValue: [Date, Date] = [new Date(2025, 5, 1), new Date(2025, 5, 3)]

		const { container } = renderUI(<DatePicker range defaultValue={defaultValue} />)

		await user.click(bySlot(container, 'datepicker-button') as HTMLButtonElement)

		expect(screen.getByLabelText('Clear selection')).toBeInTheDocument()
	})
})

describe('DatePicker input mode', () => {
	it('renders no toggle without the input prop', () => {
		renderUI(<DatePicker />)

		expect(screen.queryByRole('button', { name: 'Type the date' })).not.toBeInTheDocument()
	})

	it('shows the suffix toggle left of the calendar button', () => {
		const { container } = renderUI(<DatePicker input />)

		const toggle = screen.getByRole('button', { name: 'Type the date' })

		const calendar = screen.getByRole('button', { name: 'Open the calendar' })

		const suffix = container.querySelector('[data-slot=suffix]')

		expect(suffix).toContainElement(toggle)

		expect(suffix).toContainElement(calendar)

		expect(toggle.compareDocumentPosition(calendar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
	})

	it('opens the calendar from the suffix calendar button', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(<DatePicker input />)

		await user.click(screen.getByRole('button', { name: 'Open the calendar' }))

		expect(bySlot(container, 'datepicker-content')).toBeInTheDocument()
	})

	it('swaps the trigger for a focused DateInput when toggled', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(<DatePicker input defaultValue={new Date(2026, 5, 15)} />)

		await user.click(screen.getByRole('button', { name: 'Type the date' }))

		const input = bySlot(container, 'datepicker-input') as HTMLInputElement

		expect(input).toBeInTheDocument()

		expect(bySlot(container, 'datepicker-button')).not.toBeInTheDocument()

		expect(input).toHaveFocus()

		expect(input.value).toBe('06/15/2026')

		// The toggle hides while typing; the calendar button stays.
		expect(screen.queryByRole('button', { name: 'Type the date' })).not.toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Open the calendar' })).toBeInTheDocument()
	})

	it('selects the date text on entry so typing replaces it', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(<DatePicker input defaultValue={new Date(2026, 5, 15)} />)

		await user.click(screen.getByRole('button', { name: 'Type the date' }))

		const input = bySlot(container, 'datepicker-input') as HTMLInputElement

		expect(input.selectionStart).toBe(0)

		expect(input.selectionEnd).toBe('06/15/2026'.length)

		await user.keyboard('12252026')

		expect(input.value).toBe('12/25/2026')
	})

	it('returns to the trigger when the input blurs away', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(<DatePicker input defaultValue={new Date(2026, 5, 15)} />)

		await user.click(screen.getByRole('button', { name: 'Type the date' }))

		expect(bySlot(container, 'datepicker-input')).toBeInTheDocument()

		await user.click(document.body)

		expect(bySlot(container, 'datepicker-input')).not.toBeInTheDocument()

		const button = bySlot(container, 'datepicker-button') as HTMLButtonElement

		expect(button).toBeInTheDocument()

		// The toggle is back once typing ends.
		expect(screen.getByRole('button', { name: 'Type the date' })).toBeInTheDocument()

		// The picker is a plain combobox again; the main area opens the calendar.
		await user.click(button)

		expect(bySlot(container, 'datepicker-content')).toBeInTheDocument()
	})

	it('stays in input mode while focus hops to the control’s calendar button', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(<DatePicker input />)

		await user.click(screen.getByRole('button', { name: 'Type the date' }))

		await user.tab()

		expect(screen.getByRole('button', { name: 'Open the calendar' })).toHaveFocus()

		expect(bySlot(container, 'datepicker-input')).toBeInTheDocument()

		// Tabbing past the last control leaves the picker and exits input mode.
		await user.tab()

		expect(bySlot(container, 'datepicker-input')).not.toBeInTheDocument()
	})

	it('leaves input mode and opens the calendar from the suffix calendar button', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(<DatePicker input defaultValue={new Date(2026, 5, 15)} />)

		await user.click(screen.getByRole('button', { name: 'Type the date' }))

		expect(bySlot(container, 'datepicker-input')).toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Open the calendar' }))

		expect(bySlot(container, 'datepicker-input')).not.toBeInTheDocument()

		expect(bySlot(container, 'datepicker-content')).toBeInTheDocument()

		expect(bySlot(container, 'datepicker-button')).toBeInTheDocument()
	})

	it('renders the trigger label through the format so both modes match', () => {
		const { container } = renderUI(<DatePicker input defaultValue={new Date(2026, 5, 15)} />)

		expect(bySlot(container, 'datepicker-button')).toHaveTextContent('06/15/2026')
	})

	it('commits a typed date and carries it back to the trigger on blur', async () => {
		const user = userEvent.setup()

		const onChange = vi.fn()

		const { container } = renderUI(<DatePicker input onValueChange={onChange} />)

		await user.click(screen.getByRole('button', { name: 'Type the date' }))

		const input = bySlot(container, 'datepicker-input') as HTMLInputElement

		await user.type(input, '12252026')

		const emitted = onChange.mock.lastCall?.[0] as Date

		expect(emitted.getMonth()).toBe(11)
		expect(emitted.getDate()).toBe(25)

		await user.click(document.body)

		expect(bySlot(container, 'datepicker-button')).toHaveTextContent('12/25/2026')
	})

	it('closes the open calendar when switching to input mode', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(<DatePicker input />)

		await user.click(bySlot(container, 'datepicker-button') as HTMLButtonElement)

		expect(bySlot(container, 'datepicker-content')).toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Type the date' }))

		expect(bySlot(container, 'datepicker-content')).not.toBeInTheDocument()

		expect(bySlot(container, 'datepicker-input')).toBeInTheDocument()
	})

	it('disables the toggle when the picker is disabled', () => {
		renderUI(<DatePicker input disabled />)

		expect(screen.getByRole('button', { name: 'Type the date' })).toBeDisabled()
	})

	it('passes min and max through to the typed date', async () => {
		const user = userEvent.setup()

		const onChange = vi.fn()

		const { container } = renderUI(
			<DatePicker input max={new Date(2026, 11, 31)} onValueChange={onChange} />,
		)

		await user.click(screen.getByRole('button', { name: 'Type the date' }))

		const input = bySlot(container, 'datepicker-input') as HTMLInputElement

		await user.type(input, '06152027')

		expect(input).toHaveAttribute('aria-invalid', 'true')

		expect(onChange).not.toHaveBeenCalledWith(expect.any(Date))
	})
})
