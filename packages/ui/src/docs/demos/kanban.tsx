'use client'

import { useState } from 'react'
import { Badge } from '../../components/badge'
import {
	Kanban,
	KanbanCard,
	KanbanColumn,
	KanbanColumnBody,
	KanbanColumnHeader,
	KanbanColumnTitle,
} from '../../components/kanban'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Data Display' }

type Load = { id: string; code: string; customer: string; weight: string }

type Column = { id: string; title: string; items: Load[] }

const initialColumns: Column[] = [
	{
		id: 'booked',
		title: 'Booked',
		items: [
			{ id: 'l-1001', code: 'LD-1001', customer: 'Acme Freight', weight: '28,400 lb' },
			{ id: 'l-1002', code: 'LD-1002', customer: 'Northwind', weight: '14,100 lb' },
		],
	},
	{
		id: 'assigned',
		title: 'Assigned',
		items: [{ id: 'l-1003', code: 'LD-1003', customer: 'Globex', weight: '32,000 lb' }],
	},
	{
		id: 'in-transit',
		title: 'In Transit',
		items: [
			{ id: 'l-1004', code: 'LD-1004', customer: 'Initech', weight: '19,750 lb' },
			{ id: 'l-1005', code: 'LD-1005', customer: 'Umbrella', weight: '41,200 lb' },
		],
	},
	{
		id: 'delivered',
		title: 'Delivered',
		items: [],
	},
]

function ColumnTotalBadge({ items }: { items: Load[] }) {
	const total = items.length

	return (
		<Badge variant="outline" size="sm" className="tabular-nums">
			{total}
		</Badge>
	)
}

function Default() {
	const [columns, setColumns] = useState(initialColumns)

	return (
		<Example title="Default">
			<Stack gap={2}>
				<Kanban
					columns={columns}
					getItemKey={(load: Load) => load.id}
					onChange={setColumns}
					aria-label="Load dispatch board"
				>
					{columns.map((column) => (
						<KanbanColumn key={column.id} columnId={column.id} aria-label={column.title}>
							<KanbanColumnHeader>
								<KanbanColumnTitle>{column.title}</KanbanColumnTitle>
								<ColumnTotalBadge items={column.items} />
							</KanbanColumnHeader>
							<KanbanColumnBody>
								{column.items.map((load) => (
									<KanbanCard key={load.id} cardId={load.id} aria-label={load.code}>
										<span className="font-medium">{load.code}</span>
										<span className="text-zinc-500 dark:text-zinc-400">{load.customer}</span>
										<span className="text-xs text-zinc-500 dark:text-zinc-400">{load.weight}</span>
									</KanbanCard>
								))}
							</KanbanColumnBody>
						</KanbanColumn>
					))}
				</Kanban>
			</Stack>
		</Example>
	)
}

function ReadOnly() {
	return (
		<Example title="Read-only">
			<Kanban columns={initialColumns} getItemKey={(load: Load) => load.id} aria-label="Loads">
				{initialColumns.map((column) => (
					<KanbanColumn key={column.id} columnId={column.id}>
						<KanbanColumnHeader>
							<KanbanColumnTitle>{column.title}</KanbanColumnTitle>
							<ColumnTotalBadge items={column.items} />
						</KanbanColumnHeader>
						<KanbanColumnBody>
							{column.items.map((load) => (
								<KanbanCard key={load.id} cardId={load.id}>
									<span className="font-medium">{load.code}</span>
									<span className="text-zinc-500 dark:text-zinc-400">{load.customer}</span>
								</KanbanCard>
							))}
						</KanbanColumnBody>
					</KanbanColumn>
				))}
			</Kanban>
		</Example>
	)
}

function Disabled() {
	const [columns, setColumns] = useState(initialColumns)

	return (
		<Example title="Disabled">
			<Kanban columns={columns} getItemKey={(load: Load) => load.id} onChange={setColumns} disabled>
				{columns.map((column) => (
					<KanbanColumn key={column.id} columnId={column.id}>
						<KanbanColumnHeader>
							<KanbanColumnTitle>{column.title}</KanbanColumnTitle>
							<ColumnTotalBadge items={column.items} />
						</KanbanColumnHeader>
						<KanbanColumnBody>
							{column.items.map((load) => (
								<KanbanCard key={load.id} cardId={load.id}>
									<span className="font-medium">{load.code}</span>
								</KanbanCard>
							))}
						</KanbanColumnBody>
					</KanbanColumn>
				))}
			</Kanban>
		</Example>
	)
}

export default function KanbanDemo() {
	return (
		<Stack gap={6}>
			<Default />
			<ReadOnly />
			<Disabled />
		</Stack>
	)
}
