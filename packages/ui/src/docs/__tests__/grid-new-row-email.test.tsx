// @vitest-environment jsdom
import { fireEvent, screen } from '@testing-library/react'
import { describe, expect } from 'vitest'
import { it } from '../../__tests__/helpers/fake-clock'
import NewRow from '../pages/modules/grid/editing/new-row.tsx'
import { renderInLocale } from './copy.tsx'

// The mock server of the New row demo refuses an email that a person has. It
// trims the new email before the check, so it must store each email trimmed.
// Else an email with a space at the end goes in, and the same email without
// the space goes in after it.
//
// The add of the demo takes 800 ms, as a save to a server does. The case moves
// the fake clock past it, so the result does not depend on the speed of the
// machine.
const SAVE = 800

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
	it('refuses an email that differs from a stored one only by a space', async ({ clock }) => {
		const { container } = renderInLocale(<NewRow />, 'en')

		addPerson(container, 'Ann', 'ann@example.com ')

		await clock.advance(SAVE)

		expect(screen.queryByText('Ann')).not.toBeNull()

		addPerson(container, 'Ann Two', 'ann@example.com')

		await clock.advance(SAVE)

		expect(screen.queryByText('Enter a different email. This one is taken.')).not.toBeNull()

		expect(screen.queryByText('Ann Two')).toBeNull()
	})
})
