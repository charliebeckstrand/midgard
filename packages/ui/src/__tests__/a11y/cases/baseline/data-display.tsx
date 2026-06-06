import {
	Accordion,
	AccordionItem,
	AccordionPanel,
	AccordionTrigger,
} from '../../../../components/accordion'
import { Badge } from '../../../../components/badge'
import { DataTable, type DataTableColumn } from '../../../../components/data-table'
import { Field, Label } from '../../../../components/fieldset'
import { Listbox, ListboxLabel, ListboxOption } from '../../../../components/listbox'
import { Segment, SegmentControl, SegmentItem } from '../../../../components/segment'
import { StatusDot } from '../../../../components/status'
import { Tree, TreeItem } from '../../../../components/tree'
import type { Case } from '../types'

type Person = { id: number; name: string; email: string }

const dataTableRows: Person[] = [
	{ id: 1, name: 'Wade Cooper', email: 'wade@example.com' },
	{ id: 2, name: 'Arlene McCoy', email: 'arlene@example.com' },
]

const dataTableColumns: DataTableColumn<Person>[] = [
	{ id: 'name', title: 'Name', cell: (row) => row.name, sortable: true },
	{ id: 'email', title: 'Email', cell: (row) => row.email },
]

/** Data display — badges, status, disclosures, trees, and tabular data. */
export const dataDisplayCases: readonly Case[] = [
	['badge', <Badge key="b">New</Badge>],
	[
		// Status indicator paired with a visible text label so meaning is not
		// conveyed by the dot alone.
		'status',
		<span key="sd">
			<StatusDot status="active" /> Active
		</span>,
	],
	[
		// Disclosure pattern: each trigger is a button that controls its panel via
		// aria-expanded/aria-controls; one item open by default.
		'accordion',
		<Accordion key="ac" defaultValue="shipping">
			<AccordionItem value="shipping">
				<AccordionTrigger>Shipping</AccordionTrigger>
				<AccordionPanel>Orders ship within one business day.</AccordionPanel>
			</AccordionItem>
			<AccordionItem value="returns">
				<AccordionTrigger>Returns</AccordionTrigger>
				<AccordionPanel>Unworn items can be returned within 30 days.</AccordionPanel>
			</AccordionItem>
		</Accordion>,
	],
	[
		// Single-select segmented control (radiogroup); the group carries an
		// accessible name and one item is selected.
		'segment',
		<Segment key="sg" defaultValue="list" aria-label="View">
			<SegmentControl>
				<SegmentItem value="list">List</SegmentItem>
				<SegmentItem value="grid">Grid</SegmentItem>
			</SegmentControl>
		</Segment>,
	],
	[
		// role=tree with nested role=group; each item exposes its label and
		// expanded state.
		'tree',
		<Tree key="tr">
			<TreeItem label="Documents">
				<TreeItem label="report.pdf" />
				<TreeItem label="budget.xlsx" />
			</TreeItem>
			<TreeItem label="Photos">
				<TreeItem label="vacation.jpg" />
			</TreeItem>
		</Tree>,
	],
	[
		// Closed listbox: the trigger is a button named by its Field Label; the
		// option popover only mounts when opened.
		'listbox in field',
		<Field key="lb">
			<Label>Status</Label>
			<Listbox<string> nullable displayValue={(value: string) => value} placeholder="Select status">
				<ListboxOption value="active">
					<ListboxLabel>Active</ListboxLabel>
				</ListboxOption>
				<ListboxOption value="paused">
					<ListboxLabel>Paused</ListboxLabel>
				</ListboxOption>
			</Listbox>
		</Field>,
	],
	[
		// Data grid with a sortable column header (aria-sort) and keyed rows.
		'data table',
		<DataTable key="dt" columns={dataTableColumns} rows={dataTableRows} getKey={(row) => row.id} />,
	],
]
