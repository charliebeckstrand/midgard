import { describe, expect, it, vi } from 'vitest'

import { DatePicker, type DatePickerProps } from '../../components/date-picker'
import { bySlot, renderUI, screen, setupUser, stubMatchMedia, waitFor, within } from '../helpers'

/**
 * A picker on a phone opens as a bottom sheet. The phone is a stubbed media
 * query: no hover and a narrow viewport. The jsdom stub matches nothing, so the
 * other suites get the popover.
 */
function renderPhonePicker(props: DatePickerProps) {
	stubMatchMedia((query) => query.startsWith('(hover: none)'))

	const user = setupUser()

	const { container } = renderUI(<DatePicker aria-label="Due date" {...props} />)

	return { user, container }
}

function day(sheet: HTMLElement, label: number) {
	const option = within(sheet)
		.getAllByRole('option')
		.find((cell) => cell.textContent?.trim() === String(label))

	if (!option) throw new Error(`No day ${label}`)

	return option
}

describe('DatePicker on a phone', () => {
	it('opens the calendar in a sheet that the trigger controls', async () => {
		const { user } = renderPhonePicker({ defaultValue: new Date(2025, 5, 15) })

		const trigger = screen.getByRole('combobox', { name: 'Due date' })

		await user.click(trigger)

		const sheet = screen.getByRole('dialog', { name: 'Choose date' })

		expect(sheet).toHaveAttribute('data-slot', 'drawer')

		expect(within(sheet).getByRole('listbox')).toBeInTheDocument()

		expect(trigger).toHaveAttribute('aria-controls', bySlot(sheet, 'datepicker-sheet')?.id)

		expect(bySlot(document.body, 'datepicker-content')).toBeNull()
	})

	it('commits a picked day and closes the sheet', async () => {
		const onValueChange = vi.fn()

		const { user } = renderPhonePicker({ defaultValue: new Date(2025, 5, 15), onValueChange })

		await user.click(screen.getByRole('combobox', { name: 'Due date' }))

		await user.click(day(screen.getByRole('dialog'), 20))

		expect(onValueChange).toHaveBeenCalledWith(new Date(2025, 5, 20))

		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
	})

	it('closes the sheet with the Close button below the calendar', async () => {
		const onValueChange = vi.fn()

		const { user } = renderPhonePicker({ onValueChange })

		await user.click(screen.getByRole('combobox', { name: 'Due date' }))

		await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }))

		expect(onValueChange).not.toHaveBeenCalled()

		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
	})

	// The sheet covers the field, so focus goes into the sheet, not back to
	// the typed input as in the popover.
	it('moves focus into the sheet in input mode', async () => {
		const { user } = renderPhonePicker({ input: true })

		await user.click(screen.getByRole('button', { name: 'Open calendar' }))

		const sheet = screen.getByRole('dialog', { name: 'Choose date' })

		await waitFor(() => expect(sheet).toHaveFocus())
	})

	it('picks a range in the sheet', async () => {
		const onValueChange = vi.fn()

		const { user } = renderPhonePicker({
			range: true,
			defaultValue: [new Date(2025, 5, 1), new Date(2025, 5, 2)],
			onValueChange,
		})

		await user.click(screen.getByRole('combobox', { name: 'Due date' }))

		const sheet = screen.getByRole('dialog')

		await user.click(day(sheet, 10))

		await user.click(day(sheet, 14))

		expect(onValueChange).toHaveBeenCalledWith([new Date(2025, 5, 10), new Date(2025, 5, 14)])

		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
	})

	// The draft of a custom range drops when the sheet has gone, as it does
	// when the popover has gone, so the sheet opens again on the presets.
	it('opens the relative presets again after a custom range', async () => {
		const { user } = renderPhonePicker({ relative: true })

		await user.click(screen.getByRole('combobox', { name: 'Due date' }))

		await user.click(screen.getByRole('button', { name: /Custom range/ }))

		expect(screen.getByRole('dialog', { name: 'Custom range' })).toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Close' }))

		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

		await user.click(screen.getByRole('combobox', { name: 'Due date' }))

		expect(screen.getByRole('dialog', { name: 'Select range' })).toBeInTheDocument()
	})

	it('keeps the popover when the sheet is turned off', async () => {
		const { user } = renderPhonePicker({ sheet: false })

		await user.click(screen.getByRole('combobox', { name: 'Due date' }))

		expect(screen.getByRole('dialog', { name: 'Choose date' })).not.toHaveAttribute(
			'data-slot',
			'drawer',
		)

		expect(bySlot(document.body, 'datepicker-content')).toBeInTheDocument()
	})
})
