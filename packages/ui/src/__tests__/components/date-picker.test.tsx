import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Control } from '../../components/control'
import { DatePicker } from '../../components/date-picker'
import { useDatePickerState } from '../../components/date-picker/use-date-picker-state'
import { Form } from '../../components/form'
import { act, bySlot, fireEvent, renderUI, screen, userEvent, waitFor, within } from '../helpers'

// The footer Clear and the trigger clear share the "Clear selection" name; scope
// footer-clear queries to the popover toolbar so the closed trigger's clear (now
// on by default) doesn't make the match ambiguous.
function footerClear() {
	return within(screen.getByRole('toolbar', { name: 'Date picker actions' })).getByRole('button', {
		name: 'Clear selection',
	})
}

function findDay(day: number) {
	const days = screen.getAllByRole('option')

	return days.find((b) => b.textContent?.trim() === String(day))
}

type DatePickerApi = ReturnType<typeof useDatePickerState>

// Drives the close path with an explicit floating-ui reason via a real React ref,
// which populates the reference node the focus effect reads. The input stands
// in for a typeable reference (input-mode DatePicker): focus held there at
// close must not be yanked to the button the restore would otherwise pick.
function CloseReasonHarness({ apiRef }: { apiRef: { current: DatePickerApi | null } }) {
	const state = useDatePickerState({})

	apiRef.current = state

	return (
		<div ref={state.setReference}>
			<input aria-label="Harness input" data-slot="harness-input" />
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

		await user.click(footerClear())

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

		await user.click(footerClear())

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

	it('leaves focus put when it is already inside the reference at close', () => {
		const apiRef: { current: DatePickerApi | null } = { current: null }

		const { container } = renderUI(<CloseReasonHarness apiRef={apiRef} />)

		const input = bySlot(container, 'harness-input') as HTMLInputElement

		act(() => apiRef.current?.onOpenChange(true))

		input.focus()

		act(() => apiRef.current?.onOpenChange(false, undefined, 'escape-key'))

		expect(input).toHaveFocus()
	})
})

describe('DatePicker clearable', () => {
	it('shows a trigger clear button only when clearable and a value is set', () => {
		const { rerender } = renderUI(<DatePicker value={new Date(2025, 0, 15)} />)

		expect(screen.getByRole('button', { name: 'Clear selection' })).toBeInTheDocument()

		// No value → no clear affordance; the calendar icon keeps the slot.
		rerender(<DatePicker value={undefined} />)

		expect(screen.queryByRole('button', { name: 'Clear selection' })).not.toBeInTheDocument()
	})

	it('clears the value from the trigger and returns focus to the trigger', async () => {
		const user = userEvent.setup()

		const onChange = vi.fn()

		const { container } = renderUI(
			<DatePicker defaultValue={new Date(2025, 0, 15)} onValueChange={onChange} />,
		)

		await user.click(screen.getByRole('button', { name: 'Clear selection' }))

		expect(onChange).toHaveBeenCalledWith(undefined)

		// The clear button unmounts once empty; focus returns to the trigger
		// instead of falling to <body> (WCAG 2.4.3), and the calendar stays closed.
		expect(bySlot(container, 'datepicker-button')).toHaveFocus()

		expect(bySlot(container, 'datepicker-content')).not.toBeInTheDocument()
	})

	it('omits the trigger clear button with clearable={false}', () => {
		renderUI(<DatePicker clearable={false} value={new Date(2025, 0, 15)} />)

		expect(screen.queryByRole('button', { name: 'Clear selection' })).not.toBeInTheDocument()
	})

	it('omits the trigger clear button when disabled', () => {
		renderUI(<DatePicker disabled value={new Date(2025, 0, 15)} />)

		expect(screen.queryByRole('button', { name: 'Clear selection' })).not.toBeInTheDocument()
	})

	it('clears a range from the trigger clear button', async () => {
		const user = userEvent.setup()

		const onChange = vi.fn()

		renderUI(
			<DatePicker
				range
				defaultValue={[new Date(2025, 5, 1), new Date(2025, 5, 3)]}
				onValueChange={onChange}
			/>,
		)

		await user.click(screen.getByRole('button', { name: 'Clear selection' }))

		expect(onChange).toHaveBeenCalledWith(undefined)
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
		const { container } = renderUI(<DatePicker defaultValue={new Date(2025, 5, 15)} />)

		const button = bySlot(container, 'datepicker-button') as HTMLButtonElement

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

		const { container } = renderUI(<DatePicker defaultValue={new Date(2025, 5, 15)} />)

		const button = bySlot(container, 'datepicker-button') as HTMLButtonElement

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

		const { container } = renderUI(<DatePicker defaultValue={new Date(2025, 5, 15)} />)

		const button = bySlot(container, 'datepicker-button') as HTMLButtonElement

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
		const { container } = renderUI(
			<DatePicker defaultValue={new Date(2025, 5, 15)} onValueChange={onChange} />,
		)

		const button = bySlot(container, 'datepicker-button') as HTMLButtonElement

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

		expect(footerClear()).toBeInTheDocument()
	})
})

describe('DatePicker input', () => {
	it('renders no DateInput without the input prop', () => {
		const { container } = renderUI(<DatePicker />)

		expect(bySlot(container, 'datepicker-input')).not.toBeInTheDocument()

		expect(screen.queryByRole('button', { name: 'Open calendar' })).not.toBeInTheDocument()
	})

	it('renders a DateInput with a calendar suffix button instead of the trigger', () => {
		const { container } = renderUI(<DatePicker input />)

		expect(bySlot(container, 'datepicker-input')).toBeInTheDocument()

		expect(bySlot(container, 'datepicker-button')).not.toBeInTheDocument()

		const calendar = screen.getByRole('button', { name: 'Open calendar' })

		expect(container.querySelector('[data-slot=suffix]')).toContainElement(calendar)

		expect(calendar).toHaveAttribute('aria-expanded', 'false')
	})

	it('renders the value through the format', () => {
		const { container } = renderUI(<DatePicker input defaultValue={new Date(2026, 5, 15)} />)

		expect((bySlot(container, 'datepicker-input') as HTMLInputElement).value).toBe('06/15/2026')
	})

	it('emits a typed date through onValueChange', async () => {
		const user = userEvent.setup()

		const onChange = vi.fn()

		const { container } = renderUI(<DatePicker input onValueChange={onChange} />)

		const input = bySlot(container, 'datepicker-input') as HTMLInputElement

		await user.type(input, '12252026')

		expect(input.value).toBe('12/25/2026')

		const emitted = onChange.mock.lastCall?.[0] as Date

		expect(emitted.getMonth()).toBe(11)
		expect(emitted.getDate()).toBe(25)
	})

	it('opens the calendar from the suffix calendar button', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(<DatePicker input />)

		const calendar = screen.getByRole('button', { name: 'Open calendar' })

		await user.click(calendar)

		expect(bySlot(container, 'datepicker-content')).toBeInTheDocument()

		expect(calendar).toHaveAttribute('aria-expanded', 'true')
	})

	it('writes a picked date back into the input', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(<DatePicker input defaultValue={new Date(2025, 5, 15)} />)

		await user.click(screen.getByRole('button', { name: 'Open calendar' }))

		const day = findDay(20)

		if (!day) throw new Error('day 20 button not found')

		await user.click(day)

		expect((bySlot(container, 'datepicker-input') as HTMLInputElement).value).toBe('06/20/2025')
	})

	it('disables the input and the calendar button when disabled', () => {
		const { container } = renderUI(<DatePicker input disabled />)

		expect(bySlot(container, 'datepicker-input')).toBeDisabled()

		expect(screen.getByRole('button', { name: 'Open calendar' })).toBeDisabled()
	})

	it('passes min and max through to the typed date', async () => {
		const user = userEvent.setup()

		const onChange = vi.fn()

		const { container } = renderUI(
			<DatePicker input max={new Date(2026, 11, 31)} onValueChange={onChange} />,
		)

		const input = bySlot(container, 'datepicker-input') as HTMLInputElement

		await user.type(input, '06152027')

		expect(input).toHaveAttribute('aria-invalid', 'true')

		expect(onChange).not.toHaveBeenCalledWith(expect.any(Date))
	})

	it("surfaces DateInput's invalid-date message for an out-of-range typed entry", async () => {
		const user = userEvent.setup()

		const { container } = renderUI(<DatePicker input max={new Date(2026, 11, 31)} />)

		const input = bySlot(container, 'datepicker-input') as HTMLInputElement

		await user.type(input, '06152027')

		const message = bySlot(container, 'message')

		expect(message).toHaveTextContent('Enter a valid date (MM/DD/YYYY)')

		// The message sits in the control wrapper directly after the input frame,
		// so the field adjacency carried on the wrapper spaces it like a <Field>.
		expect(message?.parentElement).toBe(bySlot(container, 'control'))

		expect(message?.previousElementSibling).toHaveAttribute('data-slot', 'control-frame')
	})

	// Tab-cycle seam (`useDatePickerInputTab`): the handlers redirect focus at
	// the edges of the reference group and the dialog. The full loop under real
	// sequential focus navigation runs in the browser suite
	// (browser/floating-ui/date-picker-input-tab.test.tsx).
	it('hands Tab from the calendar button to the dialog, and back from its far edge', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(<DatePicker input defaultValue={new Date(2025, 5, 15)} />)

		const input = bySlot(container, 'datepicker-input') as HTMLInputElement
		const calendar = screen.getByRole('button', { name: 'Open calendar' })

		await user.click(calendar)

		// Forward off the reference group's last tabbable: dialog's first.
		fireEvent.keyDown(calendar, { key: 'Tab' })

		expect(screen.getByRole('button', { name: 'Previous month' })).toHaveFocus()

		// Forward off the dialog's last tabbable: back to the input.
		fireEvent.keyDown(screen.getByRole('button', { name: 'Today' }), { key: 'Tab' })

		expect(input).toHaveFocus()
	})

	it('hands Shift+Tab from the input to the dialog, and back from its near edge', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(<DatePicker input defaultValue={new Date(2025, 5, 15)} />)

		const input = bySlot(container, 'datepicker-input') as HTMLInputElement
		const calendar = screen.getByRole('button', { name: 'Open calendar' })

		await user.click(calendar)

		// Backward off the reference group's first tabbable: dialog's last.
		fireEvent.keyDown(input, { key: 'Tab', shiftKey: true })

		expect(screen.getByRole('button', { name: 'Today' })).toHaveFocus()

		// Backward off the dialog's first tabbable: the calendar button.
		fireEvent.keyDown(screen.getByRole('button', { name: 'Previous month' }), {
			key: 'Tab',
			shiftKey: true,
		})

		expect(calendar).toHaveFocus()
	})

	it('leaves Tab alone while the calendar is closed', () => {
		const { container } = renderUI(<DatePicker input />)

		const input = bySlot(container, 'datepicker-input') as HTMLInputElement

		input.focus()

		fireEvent.keyDown(input, { key: 'Tab', shiftKey: true })

		expect(input).toHaveFocus()
	})

	it('keeps focus and text in the input when Escape closes mid-edit', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(<DatePicker input />)

		await user.click(screen.getByRole('button', { name: 'Open calendar' }))

		const input = bySlot(container, 'datepicker-input') as HTMLInputElement

		await user.click(input)

		await user.type(input, '12252026')

		await user.keyboard('{Escape}')

		expect(bySlot(container, 'datepicker-content')).not.toBeInTheDocument()

		expect(input).toHaveFocus()

		expect(input.value).toBe('12/25/2026')
	})
})

describe('DatePicker + Form', () => {
	it('binds a single date: seeds from defaultValues and submits the picked date', async () => {
		const onSubmit = vi.fn()

		const user = userEvent.setup()

		const { container } = renderUI(
			<Form defaultValues={{ when: new Date(2025, 5, 15) }} onSubmit={onSubmit}>
				<DatePicker name="when" aria-label="When" />
				<button type="submit">Submit</button>
			</Form>,
		)

		const trigger = bySlot(container, 'datepicker-button') as HTMLButtonElement

		// Seeded from the form store: the trigger shows a formatted date.
		expect(trigger).not.toHaveTextContent('Select a date')

		// Single selection commits synchronously (setValue then close), so the
		// bound field holds the pick by submit time.
		await user.click(trigger)

		await user.click(findDay(20) as HTMLElement)

		await user.click(screen.getByRole('button', { name: 'Submit' }))

		const submitted = onSubmit.mock.calls[0]?.[0].when as Date

		expect(submitted.getMonth()).toBe(5)

		expect(submitted.getDate()).toBe(20)
	})

	it('binds a date range: seeds from defaultValues', () => {
		const { container } = renderUI(
			<Form
				defaultValues={{ span: [new Date(2025, 5, 10), new Date(2025, 5, 15)] as [Date, Date] }}
			>
				<DatePicker range name="span" aria-label="Span" />
			</Form>,
		)

		const trigger = bySlot(container, 'datepicker-button') as HTMLButtonElement

		expect(trigger).not.toHaveTextContent('Select a date')
	})

	it('binds a date range: writes the picked range back to the field', async () => {
		const onSubmit = vi.fn()

		const user = userEvent.setup()

		const { container } = renderUI(
			<Form defaultValues={{ span: undefined as [Date, Date] | undefined }} onSubmit={onSubmit}>
				<DatePicker
					range
					name="span"
					aria-label="Span"
					defaultValue={[new Date(2025, 5, 1), new Date(2025, 5, 2)]}
				/>
				<button type="submit">Submit</button>
			</Form>,
		)

		const trigger = bySlot(container, 'datepicker-button') as HTMLButtonElement

		await user.click(trigger)

		// Two endpoints commit the range and close the popover; the value lands on
		// the closing click, with no dependence on the exit animation firing.
		await user.click(findDay(12) as HTMLElement)

		await user.click(findDay(18) as HTMLElement)

		await user.click(screen.getByRole('button', { name: 'Submit' }))

		const submitted = onSubmit.mock.calls[0]?.[0].span as [Date, Date]

		expect(submitted).toHaveLength(2)

		expect(submitted[0].getDate()).toBe(12)

		expect(submitted[1].getDate()).toBe(18)
	})
})
