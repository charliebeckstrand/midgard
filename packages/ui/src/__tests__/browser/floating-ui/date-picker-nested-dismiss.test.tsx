import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { DatePicker } from '../../../components/date-picker'
import { renderUI, screen, waitFor } from '../../helpers'

/**
 * Nested-overlay outside-press (real floating engine). The calendar's month/year
 * picker is a `Popover` portaled into its own floating-ui portal, outside the
 * date picker dialog's DOM subtree. A press inside it must not register as an
 * outside press on the dialog and tear the whole picker down. The jsdom suite
 * mocks `@floating-ui/react` away (the custom outside-press listener no-ops with
 * a null floating ref), so only this project can assert it.
 */
describe('nested overlay dismiss (real browser): date picker month/year picker', () => {
	it('keeps the dialog open when selecting a year inside the picker', async () => {
		renderUI(<DatePicker defaultValue={new Date(2025, 5, 15)} />)

		// The trigger carries aria-expanded; the clearable clear button does not.
		await userEvent.click(screen.getByRole('button', { expanded: false }))

		await screen.findByRole('dialog')

		// Open the month/year picker, then switch to the year view via its center
		// label and pick a year — the press that previously dismissed the dialog.
		await userEvent.click(await screen.findByRole('button', { name: /June 2025/ }))

		await userEvent.click(await screen.findByRole('button', { name: '2025' }))

		await userEvent.click(await screen.findByRole('option', { name: '2027' }))

		// The year selection stays within the picker (back to the month view, now
		// centered on 2027) and leaves the outer dialog standing. The dialog is
		// queried by slot, not role: the open modal picker marks it aria-hidden,
		// which drops it from the accessibility tree a role query walks.
		await waitFor(() => expect(screen.getByRole('option', { name: 'Jun' })).toBeInTheDocument())

		expect(screen.getByRole('button', { name: '2027' })).toBeInTheDocument()

		expect(document.querySelector('[data-slot="datepicker-content"]')).not.toBeNull()
	})
})
