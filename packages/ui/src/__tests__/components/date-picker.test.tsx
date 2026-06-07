import { describe, expect, it, vi } from 'vitest'

import { Control } from '../../components/control'
import { DatePicker } from '../../components/date-picker'
import { useDatePickerState } from '../../components/date-picker/use-date-picker-state'
import { act, bySlot, renderUI, screen, userEvent } from '../helpers'

function findDay(day: number) {
	const days = screen.getAllByRole('option')

	return days.find((b) => b.textContent?.trim() === String(day))
}

type DatePickerApi = ReturnType<typeof useDatePickerState>

// Drives the close path with an explicit floating-ui reason. A real React ref
// (unlike a manual `setReference` call) populates the reference node the focus
// effect reads, and the outside-press listener can't be exercised in jsdom.
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

describe('DatePicker', () => {
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

	it('renders a placeholder in skeleton mode', () => {
		const { container } = renderUI(<DatePicker />, { skeleton: true })

		expect(bySlot(container, 'datepicker-button')).not.toBeInTheDocument()
		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
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
// grid, so the date picker is operable entirely from the keyboard — opening,
// moving the highlight, and committing — without the click path the other
// tests cover.
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
