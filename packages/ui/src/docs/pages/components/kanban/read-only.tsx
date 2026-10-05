import { Badge } from 'ui/badge'
import {
	Kanban,
	KanbanCard,
	KanbanColumn,
	KanbanColumnBody,
	KanbanColumnHeader,
	KanbanColumnTitle,
} from 'ui/kanban'
import { Text } from 'ui/text'
import { columns, type Load } from './loads.ts'

export default function ReadOnly() {
	return (
		<Kanban columns={columns} getKey={(load: Load) => load.id} aria-label="Read-only load board">
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
							<KanbanCard key={load.id} value={load.id}>
								<Text className="font-medium">{load.code}</Text>
								<Text tone="muted">{load.customer}</Text>
							</KanbanCard>
						))}
					</KanbanColumnBody>
				</KanbanColumn>
			))}
		</Kanban>
	)
}
