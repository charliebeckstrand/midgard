import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { List, ListItem, ListLabel } from '../../components/list'
import { expectAnnouncement, renderUI } from '../helpers'

/**
 * A pointer moves a row of a list with clicks only, from the move menu of the
 * row (WCAG 2.2 SC 2.5.7). It runs in a real browser, because the name of the
 * button comes from the accessible name of the browser: the hidden word "Move"
 * and then the name of the row, which must leave out that word.
 */

type Item = { id: string; label: string }

const start: Item[] = [
	{ id: 'a', label: 'Alpha' },
	{ id: 'b', label: 'Bravo' },
	{ id: 'c', label: 'Charlie' },
]

function Tasks({
	onReorder,
	remove = false,
}: {
	onReorder: (next: Item[]) => void
	/** Whether each row holds a Remove button of its own after its label. */
	remove?: boolean
}) {
	const [items, setItems] = useState(start)

	return (
		<List
			items={items}
			getKey={(item) => item.id}
			aria-label="Tasks"
			onReorder={(next) => {
				setItems(next)

				onReorder(next)
			}}
		>
			{(item) => (
				<ListItem
					suffix={
						remove ? (
							<button type="button" aria-label={`Remove ${item.label}`}>
								×
							</button>
						) : undefined
					}
				>
					<ListLabel>{item.label}</ListLabel>
				</ListItem>
			)}
		</List>
	)
}

describe('the move menu of a list row (real browser)', () => {
	it('names the button after the row alone', async () => {
		renderUI(<Tasks onReorder={vi.fn()} />)

		await expect
			.element(page.getByRole('button', { name: 'Move Alpha', exact: true }))
			.toBeVisible()
	})

	// The name comes from the content of the row, not from the whole row, which
	// also holds the names of its other controls.
	it('leaves the other controls of the row out of the name and the announcement', async () => {
		renderUI(<Tasks onReorder={vi.fn()} remove />)

		await userEvent.click(page.getByRole('button', { name: 'Move Alpha', exact: true }))

		await userEvent.click(page.getByRole('menuitem', { name: 'Move down' }))

		await expectAnnouncement('Alpha moved to position 2 of 3', 'assertive')
	})

	it('moves a row with clicks only, and keeps the focus on its button', async () => {
		const onReorder = vi.fn()

		renderUI(<Tasks onReorder={onReorder} />)

		await userEvent.click(page.getByRole('button', { name: 'Move Alpha', exact: true }))

		await userEvent.click(page.getByRole('menuitem', { name: 'Move to bottom' }))

		await expect
			.poll(() => (onReorder.mock.lastCall?.[0] as Item[] | undefined)?.map((item) => item.id))
			.toEqual(['b', 'c', 'a'])

		await expectAnnouncement('Alpha moved to position 3 of 3', 'assertive')

		await expect
			.element(page.getByRole('button', { name: 'Move Alpha', exact: true }))
			.toHaveFocus()
	})
})
