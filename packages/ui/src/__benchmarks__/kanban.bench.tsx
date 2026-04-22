import { cleanup, render } from '@testing-library/react'
import { bench, describe } from 'vitest'
import {
	Kanban,
	KanbanCard,
	KanbanColumn,
	KanbanColumnBody,
	KanbanColumnHeader,
	KanbanColumnTitle,
} from '../components/kanban'
import { type KanbanItem, makeKanbanColumns } from './fixtures'

const getKey = (item: KanbanItem) => item.id

const smallBoard = makeKanbanColumns(4, 25)
const mediumBoard = makeKanbanColumns(6, 100)
const largeBoard = makeKanbanColumns(8, 250)

function Board({ columns }: { columns: { id: string; items: KanbanItem[] }[] }) {
	return (
		<Kanban columns={columns} getItemKey={getKey} onChange={noop}>
			{columns.map((col) => (
				<KanbanColumn key={col.id} columnId={col.id}>
					<KanbanColumnHeader>
						<KanbanColumnTitle>{col.id}</KanbanColumnTitle>
					</KanbanColumnHeader>
					<KanbanColumnBody>
						{col.items.map((item) => (
							<KanbanCard key={item.id} cardId={item.id}>
								{item.title}
							</KanbanCard>
						))}
					</KanbanColumnBody>
				</KanbanColumn>
			))}
		</Kanban>
	)
}

describe('Kanban · initial render', () => {
	bench('small (4 × 25 = 100 cards)', () => {
		render(<Board columns={smallBoard} />)

		cleanup()
	})

	bench('medium (6 × 100 = 600 cards)', () => {
		render(<Board columns={mediumBoard} />)

		cleanup()
	})

	bench('large (8 × 250 = 2,000 cards)', () => {
		render(<Board columns={largeBoard} />)

		cleanup()
	})
})

function noop() {}
