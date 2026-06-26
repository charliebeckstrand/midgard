import {
	Accordion,
	AccordionItem,
	AccordionPanel,
	AccordionTrigger,
} from '../../../components/accordion'
import { Avatar } from '../../../components/avatar'
import { Badge } from '../../../components/badge'
import { Code } from '../../../components/code'
import { Collapse, CollapsePanel, CollapseTrigger } from '../../../components/collapse'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '../../../components/dl'
import { Field, Label } from '../../../components/fieldset'
import { Icon } from '../../../components/icon'
import { Kbd } from '../../../components/kbd'
import { List, ListItem, ListLabel } from '../../../components/list'
import { Listbox, ListboxLabel, ListboxOption } from '../../../components/listbox'
import { Odometer } from '../../../components/odometer'
import { ResizableGroup, ResizableHandle, ResizablePanel } from '../../../components/resizable'
import { Segment, SegmentControl, SegmentItem } from '../../../components/segment'
import { Stat, StatLabel, StatValue } from '../../../components/stat'
import { StatusDot } from '../../../components/status'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '../../../components/table'
import { TimeAgo } from '../../../components/time-ago'
import {
	Timeline,
	TimelineDescription,
	TimelineItem,
	TimelineTimestamp,
	TimelineTitle,
} from '../../../components/timeline'
import { Tree, TreeItem } from '../../../components/tree'
import { Grid, type GridColumn } from '../../../modules/grid'
import type { Case } from './types'

type Person = { id: number; name: string; email: string }

const dataTableRows: Person[] = [
	{ id: 1, name: 'Wade Cooper', email: 'wade@example.com' },
	{ id: 2, name: 'Arlene McCoy', email: 'arlene@example.com' },
]

const dataTableColumns: GridColumn<Person>[] = [
	{ id: 'name', title: 'Name', cell: (row) => row.name, sortable: true },
	{ id: 'email', title: 'Email', cell: (row) => row.email },
]

const listTasks = [
	{ id: 'a', label: 'Design the API' },
	{ id: 'b', label: 'Write the tests' },
]

/** Data display: badges, status, disclosures, trees, and tabular data. */
export const dataDisplayCases: readonly Case[] = [
	['badge', <Badge key="b">New</Badge>],
	[
		// Status indicator paired with a visible text label.
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
			<SegmentControl aria-label="View">
				<SegmentItem value="list">List</SegmentItem>
				<SegmentItem value="grid">Grid</SegmentItem>
			</SegmentControl>
		</Segment>,
	],
	[
		// role=tree with nested role=group; each item exposes its label and
		// expanded state.
		'tree',
		<Tree key="tr" aria-label="File tree">
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
		<Grid key="dt" columns={dataTableColumns} rows={dataTableRows} getKey={(row) => row.id} />,
	],
	[
		// Static semantic table: thead/tbody with column headers.
		'table',
		<Table key="tbl">
			<TableHead>
				<TableRow>
					<TableHeader>Name</TableHeader>
					<TableHeader>Email</TableHeader>
				</TableRow>
			</TableHead>
			<TableBody>
				{dataTableRows.map((row) => (
					<TableRow key={row.id}>
						<TableCell>{row.name}</TableCell>
						<TableCell>{row.email}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>,
	],
	[
		// Named list of items; the set is labelled and not sortable here.
		'list',
		<List key="ls" items={listTasks} aria-label="Tasks" sortable={false}>
			{(task) => (
				<ListItem>
					<ListLabel>{task.label}</ListLabel>
				</ListItem>
			)}
		</List>,
	],
	[
		// Description list: term/details pairs in a <dl>.
		'description list',
		<DescriptionList key="dl">
			<DescriptionTerm>Name</DescriptionTerm>
			<DescriptionDetails>Wade Cooper</DescriptionDetails>
			<DescriptionTerm>Email</DescriptionTerm>
			<DescriptionDetails>wade@example.com</DescriptionDetails>
		</DescriptionList>,
	],
	[
		'timeline',
		<Timeline key="tl">
			<TimelineItem>
				<TimelineTimestamp>Jan 2026</TimelineTimestamp>
				<TimelineTitle>Project kicked off</TimelineTitle>
				<TimelineDescription>Initial planning and team assembly.</TimelineDescription>
			</TimelineItem>
			<TimelineItem status="info">
				<TimelineTimestamp>Feb 2026</TimelineTimestamp>
				<TimelineTitle>Design completed</TimelineTitle>
			</TimelineItem>
		</Timeline>,
	],
	[
		'stat',
		<Stat key="st">
			<StatLabel>Monthly recurring revenue</StatLabel>
			<StatValue>$12,345</StatValue>
		</Stat>,
	],
	['avatar', <Avatar key="av" initials="WC" alt="Wade Cooper" />],
	['kbd', <Kbd key="kb">K</Kbd>],
	['code', <Code key="cd">pnpm install</Code>],
	[
		// Animated number; renders the current value as readable text.
		'odometer',
		<Odometer key="od" value={1234} />,
	],
	[
		// Relative timestamp rendered into a <time> with a machine-readable datetime.
		'time ago',
		<TimeAgo key="ta" date={new Date('2026-01-01T00:00:00Z')} />,
	],
	[
		// Disclosure: the trigger button controls its panel via aria-expanded/
		// aria-controls; opened on mount.
		'collapse',
		<Collapse key="cl" defaultOpen>
			<CollapseTrigger>Hide details</CollapseTrigger>
			<CollapsePanel>The panel body content.</CollapsePanel>
		</Collapse>,
	],
	[
		// Resizable split: each handle is a focusable role=separator with aria-valuenow.
		'resizable',
		<div key="rz" style={{ height: 80 }}>
			<ResizableGroup>
				<ResizablePanel defaultSize={50} minSize={20}>
					Left
				</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel defaultSize={50} minSize={20}>
					Right
				</ResizablePanel>
			</ResizableGroup>
		</div>,
	],
	[
		// Labelled icon: role=img with an accessible name (decorative icons stay
		// aria-hidden and need no case).
		'icon',
		<Icon key="ic" icon={<svg />} label="Information" />,
	],
]
