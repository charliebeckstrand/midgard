import { EditableGrid, type EditableGridColumn } from '../../../components/editable-grid'
import { Label } from '../../../components/fieldset'
import { Filters, FiltersField } from '../../../components/filters'
import { Input } from '../../../components/input'
import { JsonTree } from '../../../components/json-tree'
import {
	Kanban,
	KanbanCard,
	KanbanColumn,
	KanbanColumnBody,
	KanbanColumnHeader,
	KanbanColumnTitle,
} from '../../../components/kanban'
import { PivotTable } from '../../../components/pivot-table'
import { QueryBuilder, type QueryField } from '../../../components/query-builder'
import type { Case } from './types'

const noop = () => {}

const jsonSample = {
	id: 42,
	name: 'Ada Lovelace',
	active: true,
	tags: ['engineer', 'mathematician'],
	address: { city: 'London', zip: 'WC2N' },
}

const queryFields: QueryField[] = [
	{ name: 'title', label: 'Title', type: 'text' },
	{ name: 'count', label: 'Count', type: 'number' },
]

type Load = { id: string; code: string; customer: string }

const kanbanColumns = [
	{
		id: 'booked',
		title: 'Booked',
		items: [{ id: 'l-1', code: 'LD-1', customer: 'Acme Freight' }] as Load[],
	},
	{
		id: 'assigned',
		title: 'Assigned',
		items: [{ id: 'l-2', code: 'LD-2', customer: 'Globex' }] as Load[],
	},
]

type LaneRow = { lane: string; period: string; loads: number }

const pivotRows: LaneRow[] = [
	{ lane: 'West', period: 'Q1', loads: 12 },
	{ lane: 'West', period: 'Q2', loads: 9 },
	{ lane: 'East', period: 'Q1', loads: 7 },
]

type GridRow = { id: number; name: string; email: string }

const gridRows: GridRow[] = [
	{ id: 1, name: 'Wade Cooper', email: 'wade@example.com' },
	{ id: 2, name: 'Arlene McCoy', email: 'arlene@example.com' },
]

const gridColumns: EditableGridColumn<GridRow>[] = [
	{ id: 'name', title: 'Name', field: 'name' },
	{ id: 'email', title: 'Email', field: 'email' },
]

/** Complex, interactive data surfaces — trees, grids, boards, and query UIs. */
export const dataComplexCases: readonly Case[] = [
	[
		// role=tree of expandable nodes; expanded a couple of levels deep.
		'json tree',
		<JsonTree key="jt" data={jsonSample} defaultExpandDepth={2} />,
	],
	[
		// Nested group / rule editor; renders an empty root group with its controls.
		'query builder',
		<QueryBuilder key="qb" fields={queryFields} />,
	],
	[
		// Read-only board: each column and card is labelled; no reorder handlers.
		'kanban',
		<Kanban key="kb" columns={kanbanColumns} getKey={(load: Load) => load.id} aria-label="Loads">
			{kanbanColumns.map((column) => (
				<KanbanColumn key={column.id} columnId={column.id} aria-label={column.title}>
					<KanbanColumnHeader>
						<KanbanColumnTitle>{column.title}</KanbanColumnTitle>
					</KanbanColumnHeader>
					<KanbanColumnBody>
						{column.items.map((load) => (
							<KanbanCard key={load.id} cardId={load.id} aria-label={load.code}>
								<span>{load.code}</span>
								<span>{load.customer}</span>
							</KanbanCard>
						))}
					</KanbanColumnBody>
				</KanbanColumn>
			))}
		</Kanban>,
	],
	[
		// Pivot of rows into a row × column matrix with an aggregated value.
		'pivot table',
		<PivotTable
			key="pt"
			rows={pivotRows}
			keys={{ row: 'lane', column: 'period', value: 'loads' }}
			rowHeader="Lane"
		/>,
	],
	[
		// Editable data grid with column headers and keyed rows.
		'editable grid',
		<EditableGrid
			key="eg"
			columns={gridColumns}
			rows={gridRows}
			getKey={(row) => row.id}
			onValueChange={noop}
		/>,
	],
	[
		// Filter bar: FiltersField owns the control context, so Label names the
		// Input directly (no Field wrapper) and the value binds through the slot.
		'filters',
		<Filters key="fl" defaultValue={{ search: undefined }}>
			<FiltersField name="search">
				<Label>Search</Label>
				<Input placeholder="Search" />
			</FiltersField>
		</Filters>,
	],
]
