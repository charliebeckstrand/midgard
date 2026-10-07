import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Drawer, DrawerBody, DrawerPanel, DrawerTitle } from '../../../components/drawer'
import {
	Kanban,
	KanbanCard,
	KanbanCardHandle,
	KanbanColumn,
	KanbanColumnBody,
} from '../../../components/kanban'
import { ListItem, ListSortable } from '../../../components/list'
import { DensityProvider } from '../../../providers/density'
import { LocaleProvider } from '../../../providers/locale'
import { renderUI, waitFor } from '../../helpers'
import { drag } from '../helpers/drag'

/**
 * The drag overlay of a sortable follows the pointer inside a glass drawer.
 *
 * The overlay is `position: fixed`. The `backdrop-filter` of a glass panel makes
 * the panel the containing block of a fixed descendant. An overlay inside the
 * panel then sat below the dragged item by the offset of the panel. The overlay
 * now goes through a portal, out of the panel.
 *
 * Rides the real floating engine for the real portal, and the real layout for
 * the boxes.
 */
describe('drag overlay in a glass drawer (real browser)', () => {
	/** The distance that the pointer travels down. */
	const TRAVEL = 12

	/** A spacer above the sortable, so the panel and the item have different tops. */
	const spacer = <div style={{ height: 200 }} />

	function Rows() {
		const [rows, setRows] = useState(['a', 'b', 'c'])

		return (
			<ListSortable items={rows} getKey={(row) => row} onReorder={setRows} aria-label="Rows">
				{(row) => <ListItem>Row {row}</ListItem>}
			</ListSortable>
		)
	}

	function Board() {
		const [columns, setColumns] = useState([{ id: 'todo', items: ['a', 'b', 'c'] }])

		return (
			<Kanban
				columns={columns}
				getKey={(item: string) => item}
				onReorder={setColumns}
				aria-label="Board"
			>
				{columns.map((column) => (
					<KanbanColumn key={column.id} value={column.id} aria-label="Todo">
						<KanbanColumnBody>
							{column.items.map((item) => (
								<KanbanCard key={item} value={item}>
									<KanbanCardHandle />
									Card {item}
								</KanbanCard>
							))}
						</KanbanColumnBody>
					</KanbanColumn>
				))}
			</Kanban>
		)
	}

	it.each([
		{
			name: 'List',
			sortable: <Rows />,
			item: '[data-slot="list-item"]',
			handle: '[data-slot="list-handle"]',
			overlay: 'ul[inert]',
		},
		{
			name: 'Kanban',
			sortable: <Board />,
			item: '[data-slot="kanban-card"]',
			handle: '[data-slot="kanban-card-handle"]',
			overlay: '[data-slot="kanban-card"][data-overlay]',
		},
	])('puts the $name overlay on the dragged item', async ({ sortable, item, handle, overlay }) => {
		renderUI(
			<Drawer open onOpenChange={() => {}}>
				<DrawerPanel glass aria-label="Sortable">
					<DrawerTitle>Sortable</DrawerTitle>

					<DrawerBody>
						{spacer}

						{sortable}
					</DrawerBody>
				</DrawerPanel>
			</Drawer>,
		)

		const grip = await waitFor(() => {
			const node = document.querySelector<HTMLElement>(handle)

			expect(node).not.toBeNull()

			return node as HTMLElement
		})

		const source = grip.closest(item) as HTMLElement

		// The panel is glass, so it is a containing block for a fixed descendant.
		expect(
			getComputedStyle(source.closest('[data-slot="drawer"]') as Element).backdropFilter,
		).not.toBe('none')

		const start = source.getBoundingClientRect()

		const box = grip.getBoundingClientRect()

		const x = box.left + box.width / 2

		const y = box.top + box.height / 2

		const held = await drag(grip, { x, y }, [
			{ x, y: y + 4 },
			{ x, y: y + 8 },
			{ x, y: y + TRAVEL },
		])

		const picture = document.querySelector(overlay)?.getBoundingClientRect()

		await held.release()

		expect(picture?.top).toBeCloseTo(start.top + TRAVEL, 0)

		expect(picture?.left).toBeCloseTo(start.left, 0)
	})

	// The portal host writes the density and the direction of the sortable, so the
	// picture keeps the size and the side of the row that it follows.
	it('keeps the density and the direction of the List row', async () => {
		renderUI(
			<DensityProvider density="compact">
				<LocaleProvider dir="rtl">
					<Drawer open onOpenChange={() => {}}>
						<DrawerPanel glass aria-label="Sortable">
							<DrawerTitle>Sortable</DrawerTitle>

							<DrawerBody>
								<Rows />
							</DrawerBody>
						</DrawerPanel>
					</Drawer>
				</LocaleProvider>
			</DensityProvider>,
		)

		const grip = await waitFor(() => {
			const node = document.querySelector<HTMLElement>('[data-slot="list-handle"]')

			expect(node).not.toBeNull()

			return node as HTMLElement
		})

		const source = grip.closest('[data-slot="list-item"]') as HTMLElement

		const box = grip.getBoundingClientRect()

		const x = box.left + box.width / 2

		const y = box.top + box.height / 2

		const held = await drag(grip, { x, y }, [
			{ x, y: y + 4 },
			{ x, y: y + TRAVEL },
		])

		const picture = document.querySelector<HTMLElement>('ul[inert] [data-slot="list-item"]')

		const read = (node: HTMLElement | null | undefined) =>
			node && {
				direction: getComputedStyle(node).direction,
				fontSize: getComputedStyle(node).fontSize,
				height: node.getBoundingClientRect().height,
			}

		// Read while the drag is live, because the picture leaves with the drop.
		const seen = { inPortal: picture?.closest('[data-slot="portal"]') != null, row: read(picture) }

		await held.release()

		// The row itself is compact (16px, not the 18px of md) and right to left, so
		// the match says that the picture took the scopes of the row.
		expect(read(source)).toMatchObject({ direction: 'rtl', fontSize: '16px' })

		expect(seen).toEqual({ inPortal: true, row: read(source) })
	})
})
