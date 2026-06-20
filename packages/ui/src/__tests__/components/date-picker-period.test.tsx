import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { DatePicker, type DatePickerPeriodValue } from '../../components/date-picker'
import { bySlot, renderUI, screen, userEvent } from '../helpers'

// Controlled period picker: the parent holds the value so toggles round-trip
// back into the chips. A fixed `years` keeps the option labels deterministic.
function ControlledPeriodPicker({
	onChange,
}: {
	onChange?: (value: DatePickerPeriodValue | undefined) => void
}) {
	const [value, setValue] = useState<DatePickerPeriodValue | undefined>(undefined)

	return (
		<DatePicker
			period={{ years: [2025, 2026], quarters: true }}
			value={value}
			onValueChange={(next: DatePickerPeriodValue | undefined) => {
				setValue(next)

				onChange?.(next)
			}}
			aria-label="Ship period"
		/>
	)
}

describe('DatePicker (period)', () => {
	it('shows the placeholder when nothing is selected', () => {
		const { container } = renderUI(<DatePicker period placeholder="Select period" />)

		expect(container.textContent).toContain('Select period')
	})

	it('renders the selection as chips in the trigger', () => {
		const { container } = renderUI(
			<DatePicker
				period={{ years: [2025] }}
				value={{ years: [2025], quarters: [2], months: [1] }}
			/>,
		)

		const trigger = bySlot(container, 'datepicker-button')

		expect(trigger).toHaveTextContent('2025')
		expect(trigger).toHaveTextContent('Q2')
		expect(trigger).toHaveTextContent('Jan')
	})

	it('opens the popover with year, quarter, and month groups', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(
			<DatePicker period={{ years: [2025, 2026], quarters: true }} aria-label="Period" />,
		)

		await user.click(bySlot(container, 'datepicker-button') as HTMLButtonElement)

		expect(bySlot(container, 'datepicker-content')).toBeInTheDocument()
		expect(screen.getByRole('dialog', { name: 'Select period' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '2026' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Q3' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Jul' })).toBeInTheDocument()
	})

	it('hides the quarter group by default', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(<DatePicker period aria-label="Period" />)

		await user.click(bySlot(container, 'datepicker-button') as HTMLButtonElement)

		// Years and months stay on by default; quarters opt in.
		expect(screen.getByRole('button', { name: 'Jan' })).toBeInTheDocument()
		expect(screen.queryByRole('button', { name: 'Q1' })).not.toBeInTheDocument()
	})

	it('hides a facet set to false', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(<DatePicker period={{ months: false }} aria-label="Period" />)

		await user.click(bySlot(container, 'datepicker-button') as HTMLButtonElement)

		const currentYear = new Date().getFullYear()

		expect(screen.getByRole('button', { name: String(currentYear) })).toBeInTheDocument()
		expect(screen.queryByRole('button', { name: 'Jan' })).not.toBeInTheDocument()
	})

	it('renders only the explicit options supplied for a facet', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(
			<DatePicker period={{ quarters: [1, 3], months: [6, 12] }} aria-label="Period" />,
		)

		await user.click(bySlot(container, 'datepicker-button') as HTMLButtonElement)

		expect(screen.getByRole('button', { name: 'Q1' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Q3' })).toBeInTheDocument()
		expect(screen.queryByRole('button', { name: 'Q2' })).not.toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Jun' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Dec' })).toBeInTheDocument()
		expect(screen.queryByRole('button', { name: 'Jan' })).not.toBeInTheDocument()
	})

	it('toggles a month and commits a populated value', async () => {
		const user = userEvent.setup()

		const onChange = vi.fn()

		const { container } = renderUI(
			<DatePicker period onValueChange={onChange} aria-label="Period" />,
		)

		await user.click(bySlot(container, 'datepicker-button') as HTMLButtonElement)

		await user.click(screen.getByRole('button', { name: 'Jan' }))

		expect(onChange).toHaveBeenCalledWith({ years: [], quarters: [], months: [1] })
	})

	it('keeps facets independent and sorted across multiple selections', async () => {
		const user = userEvent.setup()

		const onChange = vi.fn()

		renderUI(<ControlledPeriodPicker onChange={onChange} />)

		await user.click(screen.getByRole('button', { name: 'Ship period' }))

		await user.click(screen.getByRole('button', { name: 'Mar' }))
		await user.click(screen.getByRole('button', { name: 'Jan' }))
		await user.click(screen.getByRole('button', { name: '2025' }))

		expect(onChange).toHaveBeenLastCalledWith({ years: [2025], quarters: [], months: [1, 3] })
	})

	it('reflects selection through aria-pressed and toggles back to undefined', async () => {
		const user = userEvent.setup()

		const onChange = vi.fn()

		renderUI(<ControlledPeriodPicker onChange={onChange} />)

		await user.click(screen.getByRole('button', { name: 'Ship period' }))

		const q1 = screen.getByRole('button', { name: 'Q1' })

		expect(q1).toHaveAttribute('aria-pressed', 'false')

		await user.click(q1)

		expect(screen.getByRole('button', { name: 'Q1' })).toHaveAttribute('aria-pressed', 'true')

		await user.click(screen.getByRole('button', { name: 'Q1' }))

		expect(onChange).toHaveBeenLastCalledWith(undefined)
	})

	it('clears every facet from the footer but keeps the popover open', async () => {
		const user = userEvent.setup()

		const onChange = vi.fn()

		const { container } = renderUI(
			<DatePicker
				period={{ years: [2025] }}
				value={{ years: [2025], quarters: [], months: [1] }}
				onValueChange={onChange}
				aria-label="Period"
			/>,
		)

		await user.click(bySlot(container, 'datepicker-button') as HTMLButtonElement)

		await user.click(screen.getByLabelText('Clear selection'))

		expect(onChange).toHaveBeenCalledWith(undefined)
		expect(bySlot(container, 'datepicker-content')).toBeInTheDocument()
	})

	it('omits the clear footer when the selection is empty', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(<DatePicker period={{ years: [2025] }} aria-label="Period" />)

		await user.click(bySlot(container, 'datepicker-button') as HTMLButtonElement)

		expect(screen.queryByLabelText('Clear selection')).not.toBeInTheDocument()
	})

	it('offers the supplied years, deduped and sorted, superseding the default', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(
			<DatePicker period={{ years: [2031, 2029, 2031, 2030] }} aria-label="Period" />,
		)

		await user.click(bySlot(container, 'datepicker-button') as HTMLButtonElement)

		for (const year of ['2029', '2030', '2031']) {
			expect(screen.getByRole('button', { name: year })).toBeInTheDocument()
		}

		// A single deduped button per year, and no default current-year option.
		expect(screen.getAllByRole('button', { name: '2031' })).toHaveLength(1)
		expect(
			screen.queryByRole('button', { name: String(new Date().getFullYear()) }),
		).not.toBeInTheDocument()
	})

	it('defaults to the prior and current calendar year when years is omitted', async () => {
		const user = userEvent.setup()

		const currentYear = new Date().getFullYear()

		const { container } = renderUI(<DatePicker period aria-label="Period" />)

		await user.click(bySlot(container, 'datepicker-button') as HTMLButtonElement)

		expect(screen.getByRole('button', { name: String(currentYear - 1) })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: String(currentYear) })).toBeInTheDocument()
	})
})
