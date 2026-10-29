/**
 * Kanban's board mount: every card is a dnd-kit draggable inside a droppable
 * column, so cost scales with total cards rather than with column count. The
 * three rungs span a board a user can hold on screen to one that only
 * scrolls.
 */

import {
	Kanban,
	KanbanCard,
	KanbanColumn,
	KanbanColumnBody,
	KanbanColumnHeader,
	KanbanColumnTitle,
} from '../modules/kanban'
import { noop } from '../utilities/noop'
import { compareBenches } from './compare'
import { type KanbanItem, makeKanbanColumns } from './fixtures'
import { mountBenches } from './harness'

const getKey = (item: KanbanItem) => item.id

type Board = { id: string; items: KanbanItem[] }[]

function Board({ columns }: { columns: Board }) {
	return (
		<Kanban columns={columns} getKey={getKey} onReorder={noop} aria-label="Board">
			{columns.map((column) => (
				<KanbanColumn key={column.id} value={column.id}>
					<KanbanColumnHeader>
						<KanbanColumnTitle>{column.id}</KanbanColumnTitle>
					</KanbanColumnHeader>
					<KanbanColumnBody>
						{column.items.map((item) => (
							<KanbanCard key={item.id} value={item.id}>
								{item.title}
							</KanbanCard>
						))}
					</KanbanColumnBody>
				</KanbanColumn>
			))}
		</Kanban>
	)
}

// Built at collection time: only the render belongs inside the timed region.
const BOARDS = [
	{ size: 'small', columns: 4, perColumn: 25 },
	{ size: 'medium', columns: 6, perColumn: 100 },
	{ size: 'large', columns: 8, perColumn: 250 },
].map((shape) => ({ ...shape, board: makeKanbanColumns(shape.columns, shape.perColumn) }))

compareBenches('Kanban · initial render', (bench) => {
	mountBenches(
		bench,
		BOARDS,
		({ size, columns, perColumn }) =>
			`${size} (${columns} × ${perColumn} = ${(columns * perColumn).toLocaleString()} cards)`,
		({ board }) => <Board columns={board} />,
	)
})
