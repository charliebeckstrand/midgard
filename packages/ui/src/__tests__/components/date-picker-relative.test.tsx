import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { DatePicker, type DatePickerRelativeValue } from '../../components/date-picker'
import { bySlot, renderUI, screen, userEvent, within } from '../helpers'

// Controlled relative picker: the parent holds the (always-array) value so a
// toggle round-trips back into the chips. `multiple` opts into multi-select.
function ControlledRelativePicker({
	initial,
	onChange,
	multiple,
}: {
	initial?: DatePickerRelativeValue[]
	onChange?: (value: DatePickerRelativeValue[] | undefined) => void
	multiple?: boolean
}) {
	const [value, setValue] = useState<DatePickerRelativeValue[] | undefined>(initial)

	return (
		<DatePicker
			relative={multiple ? { multiple: true } : true}
			value={value}
			onValueChange={(next: DatePickerRelativeValue[] | undefined) => {
				setValue(next)

				onChange?.(next)
			}}
			aria-label="Reporting range"
		/>
	)
}

function openPicker() {
	return userEvent.setup()
}

describe('DatePicker (relative)', () => {
	it('shows the placeholder when nothing is selected', () => {
		const { container } = renderUI(<DatePicker relative placeholder="Select range" />)

		expect(container.textContent).toContain('Select range')
	})

	it('opens to the preset list plus a custom range row', async () => {
		const user = openPicker()

		const { container } = renderUI(<DatePicker relative aria-label="Range" />)

		await user.click(bySlot(container, 'datepicker-button') as HTMLButtonElement)

		expect(screen.getByRole('dialog', { name: 'Select range' })).toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Last 7 days' })).toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'This year' })).toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Custom range' })).toBeInTheDocument()
	})

	it('does not offer a "Last 14 days" preset', async () => {
		const user = openPicker()

		const { container } = renderUI(<DatePicker relative aria-label="Range" />)

		await user.click(bySlot(container, 'datepicker-button') as HTMLButtonElement)

		expect(screen.queryByRole('button', { name: 'Last 14 days' })).not.toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Last year' })).toBeInTheDocument()
	})

	it('selects a preset, shows a chip, and keeps the popover open', async () => {
		const user = openPicker()

		const onChange = vi.fn()

		const { container } = renderUI(<ControlledRelativePicker onChange={onChange} />)

		await user.click(screen.getByRole('button', { name: 'Reporting range' }))

		await user.click(screen.getByRole('button', { name: 'Last 7 days' }))

		expect(onChange).toHaveBeenCalledTimes(1)

		// Single-select commits a one-entry array.
		expect(onChange.mock.calls[0]?.[0]).toHaveLength(1)

		expect(bySlot(container, 'datepicker-button')).toHaveTextContent('Last 7 days')

		expect(bySlot(container, 'datepicker-content')).toBeInTheDocument()
	})

	it('replaces the selection when another preset is picked (single-select)', async () => {
		const user = openPicker()

		const onChange = vi.fn()

		const { container } = renderUI(<ControlledRelativePicker onChange={onChange} />)

		await user.click(screen.getByRole('button', { name: 'Reporting range' }))

		await user.click(screen.getByRole('button', { name: 'This year' }))

		await user.click(screen.getByRole('button', { name: 'Last year' }))

		const trigger = bySlot(container, 'datepicker-button')

		// Only the latest preset stays selected.
		expect(trigger).toHaveTextContent('Last year')

		expect(trigger).not.toHaveTextContent('This year')
	})

	it('selects multiple presets at once with multiple', async () => {
		const user = openPicker()

		const onChange = vi.fn()

		const { container } = renderUI(<ControlledRelativePicker multiple onChange={onChange} />)

		await user.click(screen.getByRole('button', { name: 'Reporting range' }))

		await user.click(screen.getByRole('button', { name: 'This year' }))

		await user.click(screen.getByRole('button', { name: 'Last year' }))

		expect(onChange.mock.calls.at(-1)?.[0]).toHaveLength(2)

		const trigger = bySlot(container, 'datepicker-button')

		expect(trigger).toHaveTextContent('This year')

		expect(trigger).toHaveTextContent('Last year')
	})

	it('reflects selection through aria-pressed and toggles back to undefined', async () => {
		const user = openPicker()

		const onChange = vi.fn()

		renderUI(<ControlledRelativePicker onChange={onChange} />)

		await user.click(screen.getByRole('button', { name: 'Reporting range' }))

		const today = screen.getByRole('button', { name: 'Today' })

		expect(today).toHaveAttribute('aria-pressed', 'false')

		await user.click(today)

		expect(screen.getByRole('button', { name: 'Today' })).toHaveAttribute('aria-pressed', 'true')

		await user.click(screen.getByRole('button', { name: 'Today' }))

		expect(onChange).toHaveBeenLastCalledWith(undefined)
	})

	it('labels a span collision by the picked preset, not the first list match', async () => {
		const user = openPicker()

		// Two presets that resolve to the identical span — the real case is
		// "Last 6 months" ≡ "This year" on 1 July. A bare range match would label the
		// selection by whichever preset is listed first (Alpha); the click must win.
		const fixed = new Date(2025, 0, 1)

		function CollidingPicker() {
			const [value, setValue] = useState<DatePickerRelativeValue[] | undefined>(undefined)

			return (
				<DatePicker
					relative={{
						presets: [
							{ id: 'alpha', label: 'Alpha', resolve: () => ({ from: fixed, to: fixed }) },
							{ id: 'beta', label: 'Beta', resolve: () => ({ from: fixed, to: fixed }) },
						],
					}}
					value={value}
					onValueChange={setValue}
					aria-label="Reporting range"
				/>
			)
		}

		const { container } = renderUI(<CollidingPicker />)

		await user.click(screen.getByRole('button', { name: 'Reporting range' }))

		await user.click(screen.getByRole('button', { name: 'Beta' }))

		// Chip + row highlight follow the pick, not the list order.
		expect(bySlot(container, 'datepicker-button')).toHaveTextContent('Beta')

		expect(screen.getByRole('button', { name: 'Beta' })).toHaveAttribute('aria-pressed', 'true')

		expect(screen.getByRole('button', { name: 'Alpha' })).toHaveAttribute('aria-pressed', 'false')
	})

	it('renders only the supplied presets when overridden', async () => {
		const user = openPicker()

		const { container } = renderUI(
			<DatePicker
				relative={{
					presets: [
						{ id: 'sprint', label: 'This sprint', resolve: (now) => ({ from: now, to: now }) },
					],
				}}
				aria-label="Range"
			/>,
		)

		await user.click(bySlot(container, 'datepicker-button') as HTMLButtonElement)

		expect(screen.getByRole('button', { name: 'This sprint' })).toBeInTheDocument()

		expect(screen.queryByRole('button', { name: 'Today' })).not.toBeInTheDocument()

		// The custom-range affordance still rides along.
		expect(screen.getByRole('button', { name: 'Custom range' })).toBeInTheDocument()
	})

	it('swaps to the Start/End inputs for a custom range and back', async () => {
		const user = openPicker()

		const { container } = renderUI(<DatePicker relative aria-label="Range" />)

		await user.click(bySlot(container, 'datepicker-button') as HTMLButtonElement)

		await user.click(screen.getByRole('button', { name: 'Custom range' }))

		// Custom mode: presets give way to the Start/End inputs (each with a
		// calendar-opening suffix) + a back affordance.
		expect(screen.getByRole('button', { name: 'Back to presets' })).toBeInTheDocument()

		expect(screen.getByRole('textbox', { name: 'Start' })).toBeInTheDocument()

		expect(screen.getByRole('textbox', { name: 'End' })).toBeInTheDocument()

		expect(screen.getAllByRole('button', { name: 'Open calendar' })).toHaveLength(2)

		expect(screen.queryByRole('button', { name: 'Today' })).not.toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Back to presets' }))

		expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument()
	})

	it('picks a custom endpoint from the field calendar without closing the popover', async () => {
		const user = openPicker()

		const { container } = renderUI(<DatePicker relative aria-label="Range" />)

		await user.click(bySlot(container, 'datepicker-button') as HTMLButtonElement)

		await user.click(screen.getByRole('button', { name: 'Custom range' }))

		// The Start field's suffix opens its own calendar (a nested popover).
		await user.click(
			screen.getAllByRole('button', { name: 'Open calendar' })[0] as HTMLButtonElement,
		)

		// While open, the toggle button relabels to "Close calendar".
		expect(screen.getByRole('button', { name: 'Close calendar' })).toBeInTheDocument()

		const day = screen.getAllByRole('option').find((cell) => cell.textContent?.trim() === '10')

		if (!day) throw new Error('calendar day cell not found')

		await user.click(day)

		// The pick writes back into the Start input; the relative popover stays open.
		expect((screen.getByRole('textbox', { name: 'Start' }) as HTMLInputElement).value).not.toBe('')

		expect(screen.getByRole('button', { name: 'Back to presets' })).toBeInTheDocument()
	})

	it('shows a bound-specific error when End is typed before Start', async () => {
		const user = openPicker()

		const { container } = renderUI(<DatePicker relative aria-label="Range" />)

		await user.click(bySlot(container, 'datepicker-button') as HTMLButtonElement)

		await user.click(screen.getByRole('button', { name: 'Custom range' }))

		await user.type(screen.getByRole('textbox', { name: 'Start' }), '06012026')

		await user.type(screen.getByRole('textbox', { name: 'End' }), '07301989')

		// Not the generic format message — the entry is a real date, just too early.
		expect(bySlot(container, 'message')).toHaveTextContent('Enter a date on or after 06/01/2026')

		expect(bySlot(container, 'message')).not.toHaveTextContent('Enter a valid date')
	})

	it('keeps the list and custom footers separate', async () => {
		const user = openPicker()

		renderUI(<ControlledRelativePicker />)

		await user.click(screen.getByRole('button', { name: 'Reporting range' }))

		await user.click(screen.getByRole('button', { name: 'Last 7 days' }))

		// The footer toolbar carries the Clear in list mode (the trigger has its own).
		expect(screen.getByRole('toolbar', { name: 'Date picker actions' })).toBeInTheDocument()

		// Entering custom mode with no dates yet: no footer (nothing to clear).
		await user.click(screen.getByRole('button', { name: 'Custom range' }))

		expect(screen.queryByRole('toolbar', { name: 'Date picker actions' })).not.toBeInTheDocument()
	})

	it('drops the footer Clear with footer={{ clear: false }}', async () => {
		const user = openPicker()

		renderUI(
			<DatePicker
				relative
				defaultValue={[{ from: new Date(2026, 5, 1), to: new Date(2026, 5, 30) }]}
				footer={{ clear: false }}
				aria-label="Reporting range"
			/>,
		)

		await user.click(screen.getByRole('button', { name: 'Reporting range' }))

		// A committed span would normally surface the list-mode footer Clear.
		expect(screen.queryByRole('toolbar', { name: 'Date picker actions' })).not.toBeInTheDocument()
	})

	it('shows a custom footer Clear once both dates settle and clears the range', async () => {
		const user = openPicker()

		const onChange = vi.fn()

		const { container } = renderUI(<ControlledRelativePicker onChange={onChange} />)

		await user.click(screen.getByRole('button', { name: 'Reporting range' }))

		await user.click(screen.getByRole('button', { name: 'Custom range' }))

		// No footer until the range is complete.
		await user.type(screen.getByRole('textbox', { name: 'Start' }), '06012026')

		expect(screen.queryByRole('toolbar', { name: 'Date picker actions' })).not.toBeInTheDocument()

		await user.type(screen.getByRole('textbox', { name: 'End' }), '06302026')

		const toolbar = screen.getByRole('toolbar', { name: 'Date picker actions' })

		// Clearing empties both inputs and the committed value, staying in custom mode.
		await user.click(within(toolbar).getByRole('button', { name: 'Clear selection' }))

		expect(onChange).toHaveBeenLastCalledWith(undefined)

		expect((screen.getByRole('textbox', { name: 'Start' }) as HTMLInputElement).value).toBe('')

		expect((screen.getByRole('textbox', { name: 'End' }) as HTMLInputElement).value).toBe('')

		expect(bySlot(container, 'datepicker-content')).toBeInTheDocument()
	})

	it('commits a single span from the Start/End inputs and stays open', async () => {
		const user = openPicker()

		const onChange = vi.fn()

		const { container } = renderUI(<ControlledRelativePicker onChange={onChange} />)

		await user.click(screen.getByRole('button', { name: 'Reporting range' }))

		await user.click(screen.getByRole('button', { name: 'Custom range' }))

		// A complete Start alone does not commit a half-open range.
		await user.type(screen.getByRole('textbox', { name: 'Start' }), '06102025')

		expect(onChange).not.toHaveBeenCalled()

		await user.type(screen.getByRole('textbox', { name: 'End' }), '06202025')

		expect(onChange.mock.calls.at(-1)?.[0]).toHaveLength(1)

		// Still in custom mode with the popover open for further edits.
		expect(screen.getByRole('textbox', { name: 'Start' })).toBeInTheDocument()

		expect(bySlot(container, 'datepicker-content')).toBeInTheDocument()
	})

	it('clears an active custom range when a preset is toggled', async () => {
		const user = openPicker()

		const onChange = vi.fn()

		// A span outside any preset reads as a custom selection.
		renderUI(
			<ControlledRelativePicker
				initial={[{ from: new Date(2020, 0, 1), to: new Date(2020, 0, 5) }]}
				onChange={onChange}
			/>,
		)

		await user.click(screen.getByRole('button', { name: 'Reporting range' }))

		expect(screen.getByRole('button', { name: 'Custom range' })).toHaveAttribute(
			'aria-pressed',
			'true',
		)

		await user.click(screen.getByRole('button', { name: 'Today' }))

		expect(onChange.mock.calls.at(-1)?.[0]).toHaveLength(1)
	})

	it('clears the selection from the footer but keeps the popover open', async () => {
		const user = openPicker()

		const onChange = vi.fn()

		const { container } = renderUI(
			<ControlledRelativePicker initial={undefined} onChange={onChange} />,
		)

		await user.click(screen.getByRole('button', { name: 'Reporting range' }))

		await user.click(screen.getByRole('button', { name: 'Last 7 days' }))

		await user.click(
			within(screen.getByRole('toolbar', { name: 'Date picker actions' })).getByRole('button', {
				name: 'Clear selection',
			}),
		)

		expect(onChange).toHaveBeenLastCalledWith(undefined)

		expect(bySlot(container, 'datepicker-content')).toBeInTheDocument()
	})

	it('opens with ArrowDown and roves focus across the preset rows', async () => {
		const user = openPicker()

		const { container } = renderUI(<DatePicker relative aria-label="Range" />)

		const trigger = bySlot(container, 'datepicker-button') as HTMLButtonElement

		trigger.focus()

		await user.keyboard('{ArrowDown}')

		expect(bySlot(container, 'datepicker-content')).toBeInTheDocument()

		await user.keyboard('{ArrowDown}')

		expect(screen.getByRole('button', { name: 'Today' })).toHaveFocus()
	})

	it('enters the custom inputs from the custom row via the keyboard', async () => {
		const user = openPicker()

		const { container } = renderUI(<DatePicker relative aria-label="Range" />)

		await user.click(bySlot(container, 'datepicker-button') as HTMLButtonElement)

		await user.keyboard('{End}')

		expect(screen.getByRole('button', { name: 'Custom range' })).toHaveFocus()

		await user.keyboard('{Enter}')

		expect(screen.getByRole('button', { name: 'Back to presets' })).toBeInTheDocument()

		expect(screen.getByRole('textbox', { name: 'Start' })).toBeInTheDocument()
	})
})
