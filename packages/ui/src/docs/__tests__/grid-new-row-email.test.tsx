// @vitest-environment jsdom
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import NewRow from '../pages/modules/grid/editing/new-row.tsx'
import { renderInLocale } from './copy.tsx'

// The mock server of the New row demo refuses an email that a person has. It
// trims the new email before the check, so it must store each email trimmed.
// Else an email with a space at the end goes in, and the same email without
// the space goes in after it.

/** The editor of the column `id` in the new row. */
function slotEditor(container: HTMLElement, id: string): HTMLInputElement {
	const editor = container.querySelector<HTMLInputElement>(`td[data-grid-new-col="${id}"] input`)

	if (!editor) throw new Error(`The new row has no editor for ${id}.`)

	return editor
}

/** Fills in the name and the email of the new row, and presses Enter. */
function addPerson(container: HTMLElement, name: string, email: string) {
	fireEvent.change(slotEditor(container, 'name'), { target: { value: name } })

	fireEvent.change(slotEditor(container, 'email'), { target: { value: email } })

	fireEvent.keyDown(slotEditor(container, 'name'), { key: 'Enter' })
}

describe('the New row demo', () => {
	it('refuses an email that differs from a stored one only by a space', async () => {
		const { container } = renderInLocale(<NewRow />, 'en')

		addPerson(container, 'Ann', 'ann@example.com ')

		await waitFor(() => expect(screen.queryByText('Ann')).not.toBeNull(), { timeout: 3000 })

		addPerson(container, 'Ann Two', 'ann@example.com')

		await waitFor(
			() =>
				expect(screen.queryByText('Enter a different email. This one is taken.')).not.toBeNull(),
			{ timeout: 3000 },
		)

		expect(screen.queryByText('Ann Two')).toBeNull()
	})
})
