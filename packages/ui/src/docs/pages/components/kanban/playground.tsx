import { useState } from 'react'
import { Badge } from 'ui/badge'
import { Flex } from 'ui/flex'
import {
	Kanban,
	KanbanCard,
	KanbanCardHandle,
	KanbanColumn,
	KanbanColumnBody,
	KanbanColumnHeader,
	KanbanColumnTitle,
	type KanbanProps,
} from 'ui/kanban'
import { Text } from 'ui/text'
import { type Column, columns as initialColumns, type Load } from './loads.ts'

export default function KanbanPlayground(props: KanbanProps<Load, Column>) {
	const [columns, setColumns] = useState(initialColumns)

	return (
		<Kanban
			{...props}
			columns={columns}
			getKey={(load: Load) => load.id}
			onReorder={setColumns}
			aria-label="Load dispatch board"
		>
			{columns.map((column) => (
				<KanbanColumn key={column.id} value={column.id}>
					<KanbanColumnHeader>
						<KanbanColumnTitle>{column.title}</KanbanColumnTitle>
						<Badge variant="outline" size="md" className="tabular-nums">
							{column.items.length}
						</Badge>
					</KanbanColumnHeader>
					<KanbanColumnBody>
						{column.items.map((load) => (
							<KanbanCard key={load.id} value={load.id} aria-label={load.code}>
								<Flex align="center" gap="xs">
									<KanbanCardHandle />
									<Text as="span" className="font-medium">
										{load.code}
									</Text>
								</Flex>
								<Text tone="muted">{load.customer}</Text>
								<Text tone="muted" size="xs">
									{load.weight}
								</Text>
							</KanbanCard>
						))}
					</KanbanColumnBody>
				</KanbanColumn>
			))}
		</Kanban>
	)
}
