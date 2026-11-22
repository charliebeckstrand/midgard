import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import {
	Kanban,
	KanbanCard,
	KanbanCardHandle,
	KanbanCardMenu,
	KanbanColumn,
	KanbanColumnBody,
} from '../../modules/kanban'
import { expectAnnouncement, renderUI } from '../helpers'

/**
 * A pointer moves a card with clicks only, from the "Move to" menu of the card
 * (WCAG 2.2 SC 2.5.7). It runs in a real browser, because the names of the
 * handle and the menu button come from the accessible name of the browser. Each
 * control holds its first word in a hidden span, and the name of the card that
 * both read must leave out that span.
 */

type Item = { id: string; title: string }

type Column = { id: string; title: string; items: Item[] }

const start: Column[] = [
	{
		id: 'todo',
		title: 'Todo',
		items: [
			{ id: 'a', title: 'A' },
			{ id: 'b', title: 'B' },
		],
	},
	{ id: 'done', title: 'Done', items: [] },
]

function Board({ onReorder }: { onReorder: (next: Column[]) => void }) {
	const [columns, setColumns] = useState(start)

	return (
		<Kanban
			columns={columns}
			getKey={(item: Item) => item.id}
			aria-label="Board"
			onReorder={(next) => {
				setColumns(next)

				onReorder(next)
			}}
		>
			{columns.map((column) => (
				<KanbanColumn key={column.id} value={column.id} aria-label={column.title}>
					<KanbanColumnBody empty="Empty">
						{column.items.map((item) => (
							<KanbanCard key={item.id} value={item.id}>
								<KanbanCardHandle />
								{item.title}
								<KanbanCardMenu />
							</KanbanCard>
						))}
					</KanbanColumnBody>
				</KanbanColumn>
			))}
		</Kanban>
	)
}

describe('the move menu of a Kanban card (real browser)', () => {
	it('names the handle and the menu button after the card alone', async () => {
		renderUI(<Board onReorder={vi.fn()} />)

		await expect.element(page.getByRole('button', { name: 'Drag A', exact: true })).toBeVisible()

		await expect.element(page.getByRole('button', { name: 'Move A', exact: true })).toBeVisible()
	})

	it('moves a card to another column with clicks only', async () => {
		const onReorder = vi.fn()

		renderUI(<Board onReorder={onReorder} />)

		await userEvent.click(page.getByRole('button', { name: 'Move A', exact: true }))

		await userEvent.click(page.getByRole('menuitem', { name: 'Move to “Done”' }))

		await expect
			.poll(() =>
				(onReorder.mock.lastCall?.[0] as Column[] | undefined)?.map((column) =>
					column.items.map((item) => item.id),
				),
			)
			.toEqual([['b'], ['a']])

		await expectAnnouncement('A moved to position 1 of 1 in Done', 'assertive')

		// The focus follows the card to its handle.
		await expect.element(page.getByRole('button', { name: 'Drag A', exact: true })).toHaveFocus()
	})
})
