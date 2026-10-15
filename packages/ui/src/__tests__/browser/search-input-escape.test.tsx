import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Dialog, DialogBody, DialogPanel } from '../../components/dialog'
import { SearchInput } from '../../components/search-input'
import { renderUI, screen, waitFor } from '../helpers'

/**
 * An Escape in a SearchInput inside a Dialog (trusted key).
 *
 * An Escape in a field that holds a query clears the query, and the press must
 * stop there. Only `preventDefault` tells the escape layer of the Dialog that
 * the press is consumed. The next Escape, in the empty field, closes the
 * Dialog.
 *
 * Rides the real browser because Chromium clears a search field on Escape as
 * the default action of the key, and jsdom does not.
 */
function ColumnFilter({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
	const [open, setOpen] = useState(true)

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				onOpenChange(next)

				setOpen(next)
			}}
		>
			<DialogPanel aria-label="Columns">
				<DialogBody>
					<SearchInput aria-label="Filter columns" defaultValue="name" />
				</DialogBody>
			</DialogPanel>
		</Dialog>
	)
}

describe('SearchInput Escape inside a Dialog (real browser)', () => {
	it('clears the query and keeps the Dialog open', async () => {
		const onOpenChange = vi.fn()

		renderUI(<ColumnFilter onOpenChange={onOpenChange} />)

		const input = (await screen.findByRole('searchbox')) as HTMLInputElement

		await userEvent.click(input)

		await userEvent.keyboard('{Escape}')

		await waitFor(() => expect(input.value).toBe(''))

		expect(input).toHaveFocus()

		expect(onOpenChange).not.toHaveBeenCalled()

		// The field is empty now, so the next Escape goes to the Dialog.
		await userEvent.keyboard('{Escape}')

		await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
	})
})
