import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { DatePicker, type DatePickerRelativeValue } from '../../components/date-picker'
import { bySlot, renderUI, screen, userEvent, within } from '../helpers'

// Controlled relative picker: the parent holds the value so toggles round-trip
// back into the chips.
function ControlledRelativePicker({
	initial,
	onChange,
}: {
	initial?: DatePickerRelativeValue[]
	onChange?: (value: DatePickerRelativeValue[] | undefined) => void
}) {
	const [value, setValue] = useState<DatePickerRelativeValue[] | undefined>(initial)

	return (
		<DatePicker
			relative
			value={value}
			onValueChange={(next) => {
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

function findDay(day: number) {
	return screen.getAllByRole('option').find((cell) => cell.textContent?.trim() === String(day))
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

	it('toggles a preset, shows a chip, and keeps the popover open', async () => {
		const user = openPicker()

		const onChange = vi.fn()

		const { container } = renderUI(<ControlledRelativePicker onChange={onChange} />)

		await user.click(screen.getByRole('button', { name: 'Reporting range' }))

		await user.click(screen.getByRole('button', { name: 'Last 7 days' }))

		expect(onChange).toHaveBeenCalledTimes(1)
		expect(onChange.mock.calls[0]?.[0]).toHaveLength(1)
		expect(bySlot(container, 'datepicker-button')).toHaveTextContent('Last 7 days')
		expect(bySlot(container, 'datepicker-content')).toBeInTheDocument()
	})

	it('selects multiple presets at once', async () => {
		const user = openPicker()

		const onChange = vi.fn()

		const { container } = renderUI(<ControlledRelativePicker onChange={onChange} />)

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

	it('swaps to the calendar for a custom range and back', async () => {
		const user = openPicker()

		const { container } = renderUI(<DatePicker relative aria-label="Range" />)

		await user.click(bySlot(container, 'datepicker-button') as HTMLButtonElement)

		await user.click(screen.getByRole('button', { name: 'Custom range' }))

		// Calendar mode: presets give way to the day grid + a back affordance.
		expect(screen.getByRole('button', { name: 'Back to presets' })).toBeInTheDocument()
		expect(screen.queryByRole('button', { name: 'Today' })).not.toBeInTheDocument()
		expect(screen.getAllByRole('option').length).toBeGreaterThan(0)

		await user.click(screen.getByRole('button', { name: 'Back to presets' }))

		expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument()
	})

	it('commits a single span from the custom calendar and returns to the list', async () => {
		const user = openPicker()

		const onChange = vi.fn()

		const { container } = renderUI(<ControlledRelativePicker onChange={onChange} />)

		await user.click(screen.getByRole('button', { name: 'Reporting range' }))

		await user.click(screen.getByRole('button', { name: 'Custom range' }))

		const start = findDay(10)
		const end = findDay(20)

		if (!start || !end) throw new Error('calendar day cells not found')

		await user.click(start)
		await user.click(end)

		expect(onChange.mock.calls.at(-1)?.[0]).toHaveLength(1)
		// Back in list mode with the custom selection still open for editing.
		expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument()
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

	it('enters the calendar from the custom row via the keyboard', async () => {
		const user = openPicker()

		const { container } = renderUI(<DatePicker relative aria-label="Range" />)

		await user.click(bySlot(container, 'datepicker-button') as HTMLButtonElement)

		await user.keyboard('{End}')

		expect(screen.getByRole('button', { name: 'Custom range' })).toHaveFocus()

		await user.keyboard('{Enter}')

		expect(screen.getByRole('button', { name: 'Back to presets' })).toBeInTheDocument()
	})
})
