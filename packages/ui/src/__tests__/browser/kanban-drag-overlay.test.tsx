import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import {
	Kanban,
	KanbanCard,
	KanbanCardHandle,
	KanbanColumn,
	KanbanColumnBody,
} from '../../modules/kanban'
import { renderUI } from '../helpers'
import { drag, type Point } from './helpers/drag'

/**
 * Kanban drag overlay (real pointer). The overlay is the picture of the card
 * that follows the pointer, so it shows the content of the card now. A card
 * whose content names its column changes its content on the live move to
 * another column. jsdom lays nothing out for the pointer sensor, so only a real
 * browser travels the move.
 */
describe('Kanban drag overlay (real browser)', () => {
	type Item = { id: string }

	type Column = { id: string; items: Item[] }

	/** The center of `el`, in client space. */
	const getCenter = (el: Element): Point => {
		const box = el.getBoundingClientRect()

		return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
	}

	/** A board whose cards name the column that holds them. */
	function Board({ initial }: { initial: Column[] }) {
		const [columns, setColumns] = useState(initial)

		return (
			<Kanban
				columns={columns}
				getKey={(item: Item) => item.id}
				onReorder={setColumns}
				aria-label="Board"
			>
				{columns.map((column) => (
					<KanbanColumn key={column.id} value={column.id} aria-label={column.id}>
						<KanbanColumnBody>
							{column.items.map((item) => (
								<KanbanCard key={item.id} value={item.id}>
									<KanbanCardHandle />
									{`${item.id} in ${column.id}`}
								</KanbanCard>
							))}
						</KanbanColumnBody>
					</KanbanColumn>
				))}
			</Kanban>
		)
	}

	it('shows the content of the card after the live move to another column', async () => {
		const { container } = renderUI(
			<Board
				initial={[
					{ id: 'todo', items: [{ id: 'a' }] },
					{ id: 'done', items: [{ id: 'b' }] },
				]}
			/>,
		)

		const query = (selector: string) => {
			const el = container.querySelector<HTMLElement>(selector)

			if (!el) throw new Error(`expected ${selector}`)

			return el
		}

		const handle = query('[data-card-id="a"] [data-slot="kanban-card-handle"]')

		const from = getCenter(handle)

		const held = await drag(handle, from, [
			{ x: from.x, y: from.y + 20 },
			getCenter(query('[data-card-id="b"]')),
		])

		const overlay = () => document.querySelector('[data-overlay="true"]')

		await expect.poll(() => overlay()?.textContent).toContain('a in')

		// The live move puts the card in the other column.
		await expect
			.poll(() => query('[data-column-id="done"]').contains(query('[data-card-id="a"]')))
			.toBe(true)

		await expect.poll(() => overlay()?.textContent).toBe('a in done')

		await held.release()
	})
})
