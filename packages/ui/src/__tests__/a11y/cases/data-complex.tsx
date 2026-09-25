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
import { Grid, type GridColumn } from '../../../modules/grid'
import { createGroup, QueryBuilder, QueryChips, type QueryField } from '../../../modules/query'
import { noop } from '../../helpers'
import type { Case } from './types'

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

const gridColumns: GridColumn<GridRow>[] = [
	{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
	{ id: 'email', title: 'Email', field: 'email', cell: (row) => row.email },
]

// No field and no slot, so this column can never edit.
const cellScopedColumns: GridColumn<GridRow>[] = [
	...gridColumns,
	{ id: 'id', title: 'ID', cell: (row) => String(row.id) },
]

/** Complex, interactive data surfaces: trees, grids, boards, and query UIs. */
export const dataComplexCases: readonly Case[] = [
	{
		// role=tree of expandable nodes; expanded two levels deep.
		name: 'json tree',
		element: <JsonTree key="jt" data={jsonSample} defaultExpandDepth={2} />,
	},
	{
		// Nested group / rule editor; renders an empty root group with its controls.
		name: 'query builder',
		element: <QueryBuilder key="qb" fields={queryFields} />,
	},
	{
		// The editor with reorder on: a drag grip beside each of the two rules.
		name: 'query builder reorder',
		element: (
			<QueryBuilder
				key="qbr"
				fields={queryFields}
				defaultValue={createGroup('and', [
					{ id: 'o1', type: 'rule', field: 'title', operator: 'contains', value: 'plan' },
					{ id: 'o2', type: 'rule', combinator: 'or', field: 'count', operator: 'gt', value: 3 },
				])}
				reorder
			/>
		),
	},
	{
		// Filter bar: a named toolbar of chip remove buttons and an AND/OR switch.
		name: 'query chips',
		element: (
			<QueryChips
				key="qc"
				fields={queryFields}
				defaultValue={createGroup('and', [
					{ id: 'c1', type: 'rule', field: 'title', operator: 'contains', value: 'plan' },
					{ id: 'c2', type: 'rule', combinator: 'or', field: 'count', operator: 'gt', value: 3 },
				])}
			/>
		),
	},
	{
		// Read-only board: each column and card is labeled; no reorder handlers.
		name: 'kanban',
		element: (
			<Kanban key="kb" columns={kanbanColumns} getKey={(load: Load) => load.id} aria-label="Loads">
				{kanbanColumns.map((column) => (
					<KanbanColumn key={column.id} value={column.id} aria-label={column.title}>
						<KanbanColumnHeader>
							<KanbanColumnTitle>{column.title}</KanbanColumnTitle>
						</KanbanColumnHeader>
						<KanbanColumnBody>
							{column.items.map((load) => (
								<KanbanCard key={load.id} value={load.id} aria-label={load.code}>
									<span>{load.code}</span>
									<span>{load.customer}</span>
								</KanbanCard>
							))}
						</KanbanColumnBody>
					</KanbanColumn>
				))}
			</Kanban>
		),
	},
	{
		// Pivot of rows into a row × column matrix with an aggregated value.
		name: 'pivot table',
		element: (
			<PivotTable
				key="pt"
				rows={pivotRows}
				keys={{ row: 'lane', column: 'period', value: 'loads' }}
				rowHeader="Lane"
			/>
		),
	},
	{
		// Editable data grid with column headers and keyed rows.
		name: 'editable grid',
		element: (
			<Grid
				key="eg"
				columns={gridColumns}
				rows={gridRows}
				getKey={(row) => row.id}
				editable={{ rows: new Set([1]), onCommit: noop }}
			/>
		),
	},
	{
		// Cell-scoped editable grid with a session open: one editor in a narrowed
		// row, beside a display-only column that reads as read-only.
		name: 'editable grid, cell scope',
		element: (
			<Grid
				key="egc"
				columns={cellScopedColumns}
				rows={gridRows}
				getKey={(row) => row.id}
				editable={{
					session: 'managed',
					scope: 'cell',
					defaultCell: { rowKey: 1, columnId: 'name' },
					onCommit: noop,
				}}
			/>
		),
	},
	{
		// Filter bar: FiltersField owns the control context; Label names the
		// Input directly (no Field wrapper) and the value binds through the slot.
		name: 'filters',
		element: (
			<Filters key="fl" aria-label="Filters" defaultValue={{ search: undefined }}>
				<FiltersField name="search">
					<Label>Search</Label>
					<Input placeholder="Search" />
				</FiltersField>
			</Filters>
		),
	},
]
