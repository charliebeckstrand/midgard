import states from 'us-atlas/states-10m.json'
import { Badge } from '../../../components/badge'
import { Label } from '../../../components/fieldset'
import { Filters, FiltersBar, FiltersField, FiltersRow } from '../../../components/filters'
import { Input } from '../../../components/input'
import {
	Kanban,
	KanbanCard,
	KanbanColumn,
	KanbanColumnBody,
	KanbanColumnHeader,
	KanbanColumnTitle,
} from '../../../components/kanban'
import { Select, SelectLabel, SelectOption } from '../../../components/select'
import { Stat, StatDelta, StatDescription, StatValue } from '../../../components/stat'
import {
	ChatList,
	ChatListItem,
	type ChatMessageData,
	ChatPrompt,
	ChatTranscript,
} from '../../../modules/chat'
import { Dashboard, type DashboardLayoutItem, DashboardTile } from '../../../modules/dashboard'
import { Grid, type GridColumn } from '../../../modules/grid'
import { type MapCategory, type MapFeature, MapPlat, type MapTopology } from '../../../modules/map'
import {
	QueryBuilder,
	QueryChips,
	type QueryField,
	type QueryGroup,
	QuerySummary,
} from '../../../modules/query'
import { noop } from '../../../utilities'
import { FixtureCase, FixtureGroup, FixtureSheet } from '../fixture'

type Person = {
	id: number
	name: string
	email: string
	role: string
	hours: number
	status: 'active' | 'inactive'
}

const PEOPLE: Person[] = [
	{
		id: 1,
		name: 'Wade Cooper',
		email: 'wade@example.com',
		role: 'Developer',
		hours: 32,
		status: 'active',
	},
	{
		id: 2,
		name: 'Arlene McCoy',
		email: 'arlene@example.com',
		role: 'Designer',
		hours: 40,
		status: 'active',
	},
	{
		id: 3,
		name: 'Devon Webb',
		email: 'devon@example.com',
		role: 'Manager',
		hours: 16,
		status: 'inactive',
	},
	{
		id: 4,
		name: 'Tanya Fox',
		email: 'tanya@example.com',
		role: 'Analyst',
		hours: 24,
		status: 'active',
	},
]

const COLUMNS: GridColumn<Person>[] = [
	{ id: 'select', selectable: true },
	{ id: 'name', title: 'Name', cell: (row) => row.name },
	{ id: 'email', title: 'Email', cell: (row) => row.email },
	{ id: 'role', title: 'Role', cell: (row) => row.role },
	{ id: 'hours', title: 'Hours', cell: (row) => row.hours },
	{
		id: 'status',
		title: 'Status',
		cell: (row) => <Badge color={row.status === 'active' ? 'green' : 'zinc'}>{row.status}</Badge>,
	},
]

const PLAIN_COLUMNS = COLUMNS.filter((column) => column.id !== 'select')

const SELECTED = new Set<string | number>([2])

const getPersonKey = (row: Person) => row.id

const TRANSCRIPT: ChatMessageData[] = [
	{
		id: '1',
		sender: 'user',
		content: 'Which shipments are late on the north routes?',
		timestamp: '11:10 AM',
	},
	{
		id: '2',
		sender: 'assistant',
		content: [
			{
				kind: 'tool',
				id: 's1',
				name: 'Filter shipments',
				status: 'done',
				summary: 'status is late AND lane is north',
			},
			{ kind: 'text', id: 't1', text: 'Twelve are late, and **Route 12** carries most of them.' },
		],
		timestamp: '11:11 AM',
	},
	{ id: '3', sender: 'user', content: 'Thanks, send the list to dispatch.' },
]

const STEP_STATES: ChatMessageData[] = [
	{
		id: '1',
		sender: 'assistant',
		content: [
			{ kind: 'tool', id: 's1', name: 'Load atlas', status: 'done', summary: '3,108 counties' },
			{
				kind: 'tool',
				id: 's2',
				name: 'Fetch weather',
				status: 'failed',
				summary: 'the provider did not answer',
			},
		],
	},
]

const CONVERSATIONS = [
	{ id: '1', title: 'Project kickoff' },
	{ id: '2', title: 'Bug investigation' },
	{ id: '3', title: 'Code review' },
]

const FIELDS: QueryField[] = [
	{ name: 'name', label: 'Name', type: 'text' },
	{ name: 'age', label: 'Age', type: 'number' },
	{
		name: 'status',
		label: 'Status',
		type: 'select',
		options: [
			{ value: 'active', label: 'Active' },
			{ value: 'pending', label: 'Pending' },
		],
	},
	{ name: 'verified', label: 'Verified', type: 'boolean' },
]

const SEED: QueryGroup = {
	id: 'root',
	type: 'group',
	combinator: 'and',
	children: [{ id: 'r1', type: 'rule', field: 'status', operator: 'equals', value: 'active' }],
}

const QUERY: QueryGroup = {
	id: 'root',
	type: 'group',
	combinator: 'and',
	children: [
		{ id: 'r1', type: 'rule', field: 'status', operator: 'equals', value: 'active' },
		{ id: 'r2', type: 'rule', field: 'age', operator: 'gte', value: '18' },
		{
			id: 'r3',
			type: 'rule',
			combinator: 'or',
			field: 'verified',
			operator: 'isTrue',
			value: null,
		},
	],
}

const LAYOUT: DashboardLayoutItem[] = [
	{ id: 'units', x: 0, y: 0, w: 12, h: 16 },
	{ id: 'revenue', x: 12, y: 0, w: 12, h: 16 },
]

type StateZone = { state: string; zone: string }

const ZONES: StateZone[] = [
	{ state: 'Washington', zone: 'Pacific' },
	{ state: 'Oregon', zone: 'Pacific' },
	{ state: 'California', zone: 'Pacific' },
	{ state: 'Nevada', zone: 'Pacific' },
	{ state: 'Montana', zone: 'Mountain' },
	{ state: 'Idaho', zone: 'Mountain' },
	{ state: 'Utah', zone: 'Mountain' },
	{ state: 'Colorado', zone: 'Mountain' },
	{ state: 'Arizona', zone: 'Mountain' },
	{ state: 'Texas', zone: 'Central' },
	{ state: 'Kansas', zone: 'Central' },
	{ state: 'Illinois', zone: 'Central' },
	{ state: 'Minnesota', zone: 'Central' },
	{ state: 'New York', zone: 'Eastern' },
	{ state: 'Georgia', zone: 'Eastern' },
	{ state: 'Ohio', zone: 'Eastern' },
	{ state: 'Florida', zone: 'Eastern' },
]

const ZONE_CATEGORIES: MapCategory[] = [
	{ value: 'Pacific', color: 'blue' },
	{ value: 'Mountain', color: 'orange' },
	{ value: 'Central', color: 'green' },
	{ value: 'Eastern', color: 'red' },
]

const stateName = (feature: MapFeature) => String(feature.properties?.name)

type Load = { id: string; code: string; customer: string }

type Lane = { id: string; title: string; items: Load[] }

const LANES: Lane[] = [
	{
		id: 'booked',
		title: 'Booked',
		items: [
			{ id: 'l-1001', code: 'LD-1001', customer: 'Acme Freight' },
			{ id: 'l-1002', code: 'LD-1002', customer: 'Northwind' },
		],
	},
	{
		id: 'in-transit',
		title: 'In Transit',
		items: [{ id: 'l-1003', code: 'LD-1003', customer: 'Globex' }],
	},
	{ id: 'delivered', title: 'Delivered', items: [] },
]

const getLoadKey = (load: Load) => load.id

const FILTERS = { search: 'Acme', status: 'active' }

function Board({ disabled }: { disabled?: boolean }) {
	return (
		<Kanban
			columns={LANES}
			getKey={getLoadKey}
			onReorder={disabled ? noop : undefined}
			disabled={disabled}
			aria-label="Loads"
			className="w-full"
		>
			{LANES.map((lane) => (
				<KanbanColumn key={lane.id} value={lane.id}>
					<KanbanColumnHeader>
						<KanbanColumnTitle>{lane.title}</KanbanColumnTitle>
						<Badge variant="outline" className="tabular-nums">
							{lane.items.length}
						</Badge>
					</KanbanColumnHeader>
					<KanbanColumnBody>
						{lane.items.map((load) => (
							<KanbanCard key={load.id} value={load.id}>
								<span className="font-medium">{load.code}</span>
								<span className="text-zinc-500 dark:text-zinc-400">{load.customer}</span>
							</KanbanCard>
						))}
					</KanbanColumnBody>
				</KanbanColumn>
			))}
		</Kanban>
	)
}

export function Sheet() {
	return (
		<FixtureSheet title="Modules">
			<FixtureGroup title="Grid">
				<FixtureCase label="selected row, full width" wide>
					<div className="@container w-full">
						<Grid
							columns={COLUMNS}
							rows={PEOPLE}
							getKey={getPersonKey}
							selection={{ defaultValue: SELECTED }}
							className="w-full"
						/>
					</div>
				</FixtureCase>
				<FixtureCase label="empty">
					<div className="@container w-full">
						<Grid columns={PLAIN_COLUMNS} rows={[]} getKey={getPersonKey} className="w-full" />
					</div>
				</FixtureCase>
			</FixtureGroup>
			<FixtureGroup title="Chat">
				<FixtureCase label="transcript">
					<ChatTranscript messages={TRANSCRIPT} className="w-full" />
				</FixtureCase>
				<FixtureCase label="step states">
					<ChatTranscript messages={STEP_STATES} className="w-full" />
				</FixtureCase>
				<FixtureCase label="list, prompt, disabled prompt">
					<ChatList aria-label="Conversations" className="w-full">
						{CONVERSATIONS.map((conversation) => (
							<ChatListItem
								key={conversation.id}
								title={conversation.title}
								current={conversation.id === '1'}
							/>
						))}
					</ChatList>
					<ChatPrompt value="" onValueChange={noop} onSubmit={noop} className="w-full" />
					<ChatPrompt
						value="Draft reply"
						onValueChange={noop}
						onSubmit={noop}
						disabled
						className="w-full"
					/>
				</FixtureCase>
			</FixtureGroup>
			<FixtureGroup title="Query">
				<FixtureCase label="builder" wide>
					<QueryBuilder fields={FIELDS} defaultValue={SEED} className="w-full" />
				</FixtureCase>
				<FixtureCase label="chips, summary">
					<QueryChips fields={FIELDS} defaultValue={QUERY} />
					<QuerySummary value={QUERY} fields={FIELDS} />
				</FixtureCase>
			</FixtureGroup>
			<FixtureGroup title="Dashboard">
				<FixtureCase label="stat tiles" wide>
					<div className="w-full">
						<Dashboard aria-label="Sales" layout={{ defaultValue: LAYOUT }}>
							<DashboardTile id="units" title="Units sold">
								<Stat>
									<StatValue size="sm">2,418</StatValue>
									<StatDescription>in 6 months</StatDescription>
								</Stat>
							</DashboardTile>
							<DashboardTile id="revenue" title="Monthly revenue">
								<Stat>
									<StatValue size="sm">8,940</StatValue>
									<StatDelta trend="up">↑ 4.2% vs May</StatDelta>
								</Stat>
							</DashboardTile>
						</Dashboard>
					</div>
				</FixtureCase>
			</FixtureGroup>
			<FixtureGroup title="Map">
				<FixtureCase label="categories, legend">
					<div className="w-full">
						<MapPlat
							aria-label="Timezones"
							geography={states as unknown as MapTopology}
							projection="albers-usa"
							data={ZONES}
							regionKey="state"
							categoryKey="zone"
							categories={ZONE_CATEGORIES}
							regionId={stateName}
							legend="bottom"
						/>
					</div>
				</FixtureCase>
			</FixtureGroup>
			<FixtureGroup title="Kanban">
				<FixtureCase label="read-only" wide>
					<Board />
				</FixtureCase>
				<FixtureCase label="disabled" wide>
					<Board disabled />
				</FixtureCase>
			</FixtureGroup>
			<FixtureGroup title="Filters">
				<FixtureCase label="two fields" wide>
					<Filters aria-label="Filters" defaultValue={FILTERS} className="w-full">
						<FiltersBar>
							<FiltersRow>
								<FiltersField name="search">
									<Label>Search</Label>
									<Input placeholder="Search" />
								</FiltersField>
								<FiltersField name="status">
									<Label>Status</Label>
									<Select nullable placeholder="All statuses" displayValue={(v: string) => v}>
										<SelectOption value="active">
											<SelectLabel>Active</SelectLabel>
										</SelectOption>
										<SelectOption value="inactive">
											<SelectLabel>Inactive</SelectLabel>
										</SelectOption>
									</Select>
								</FiltersField>
							</FiltersRow>
						</FiltersBar>
					</Filters>
				</FixtureCase>
			</FixtureGroup>
		</FixtureSheet>
	)
}
