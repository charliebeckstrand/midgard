import { ArrowDown, ArrowUp, File, Folder } from 'lucide-react'
import { Avatar, AvatarGroup } from '../../../components/avatar'
import {
	DescriptionDetails,
	DescriptionList,
	DescriptionTerm,
} from '../../../components/description-list'
import { Icon } from '../../../components/icon'
import { JsonTree } from '../../../components/json-tree'
import { List, ListDescription, ListItem, ListLabel } from '../../../components/list'
import { Odometer } from '../../../components/odometer'
import { PivotTable } from '../../../components/pivot-table'
import { Sparkline } from '../../../components/sparkline'
import { Stat, StatDelta, StatDescription, StatLabel, StatValue } from '../../../components/stat'
import { Swatch } from '../../../components/swatch'
import {
	Table,
	TableBody,
	TableCell,
	TableEmpty,
	TableHead,
	TableHeader,
	TableRow,
} from '../../../components/table'
import {
	Timeline,
	TimelineDescription,
	TimelineItem,
	TimelineTimestamp,
	TimelineTitle,
} from '../../../components/timeline'
import { Tree, TreeItem } from '../../../components/tree'
import { FixtureCase, FixtureGroup, FixtureSheet } from '../fixture'

const USERS = [
	{ name: 'Wade Cooper', email: 'wade@example.com', role: 'Admin' },
	{ name: 'Arlene McCoy', email: 'arlene@example.com', role: 'Editor' },
	{ name: 'Devon Webb', email: 'devon@example.com', role: 'Viewer' },
]

const TASKS = [
	{ id: 'plan', label: 'Plan', description: 'Agree on the scope' },
	{ id: 'build', label: 'Build', description: 'Write the code and the tests' },
	{ id: 'ship', label: 'Ship', description: 'Release to production' },
]

const LIST_VARIANTS = ['separated', 'outline', 'plain', 'solid', 'bare'] as const

const JSON_SAMPLE = {
	id: 42,
	name: 'Ada Lovelace',
	active: true,
	meta: null,
	tags: ['engineer', 'mathematician'],
	address: { city: 'London', zip: 'WC2N' },
}

const SERIES = [4, 6, 5, 9, 8, 12, 11, 15, 14, 19, 22, 20]

const SPARK_COLORS = ['zinc', 'red', 'amber', 'green', 'blue'] as const

const AVATAR_COLORS = ['zinc', 'red', 'amber', 'green', 'blue'] as const

const AVATAR_VARIANTS = ['solid', 'soft', 'outline'] as const

const AVATAR_SIZES = ['sm', 'md', 'lg'] as const

const SWATCH_SHAPES = ['square', 'circle', 'line'] as const

const SWATCH_VARIANTS = ['solid', 'soft', 'outline', 'dashed'] as const

const SWATCH_SIZES = ['xs', 'sm', 'md', 'lg', 'xl'] as const

const SWATCH_COLORS = ['blue', 'orange', 'violet', 'green', 'red', 'sky', 'amber', 'rose'] as const

const LOADS = [
	{ lane: 'LAX → DFW', period: 'Jan', loads: 12 },
	{ lane: 'LAX → DFW', period: 'Feb', loads: 9 },
	{ lane: 'ORD → ATL', period: 'Jan', loads: 4 },
	{ lane: 'ORD → ATL', period: 'Feb', loads: 11 },
	{ lane: 'SEA → JFK', period: 'Jan', loads: 5 },
]

function UserTable(props: { outline?: boolean; striped?: boolean }) {
	return (
		<Table {...props}>
			<TableHead>
				<TableRow>
					<TableHeader>Name</TableHeader>
					<TableHeader>Role</TableHeader>
				</TableRow>
			</TableHead>
			<TableBody>
				{USERS.map((user) => (
					<TableRow key={user.email}>
						<TableCell>{user.name}</TableCell>
						<TableCell>{user.role}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	)
}

export function Sheet() {
	return (
		<FixtureSheet title="Data display">
			<FixtureGroup title="Table">
				<FixtureCase label="default">
					<UserTable />
				</FixtureCase>
				<FixtureCase label="striped">
					<UserTable striped />
				</FixtureCase>
				<FixtureCase label="outline">
					<UserTable outline />
				</FixtureCase>
				<FixtureCase label="empty">
					<Table>
						<TableHead>
							<TableRow>
								<TableHeader>Name</TableHeader>
								<TableHeader>Role</TableHeader>
							</TableRow>
						</TableHead>
						<TableEmpty columns={2} />
					</Table>
				</FixtureCase>
				<FixtureCase label="long content, full width" wide>
					<Table striped>
						<TableHead>
							<TableRow>
								<TableHeader>Name</TableHeader>
								<TableHeader>Email</TableHeader>
								<TableHeader>Notes</TableHeader>
							</TableRow>
						</TableHead>
						<TableBody>
							{USERS.map((user) => (
								<TableRow key={user.email}>
									<TableCell>{user.name}</TableCell>
									<TableCell>{user.email}</TableCell>
									<TableCell>
										A note that is long enough to wrap inside the cell at a narrow width
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="List">
				{LIST_VARIANTS.map((variant) => (
					<FixtureCase key={variant} label={variant}>
						<List
							variant={variant}
							items={TASKS}
							getKey={(task) => task.id}
							aria-label={variant}
							className="w-full"
						>
							{(task) => (
								<ListItem>
									<ListLabel>{task.label}</ListLabel>
								</ListItem>
							)}
						</List>
					</FixtureCase>
				))}
				<FixtureCase label="horizontal">
					<List
						orientation="horizontal"
						items={TASKS}
						getKey={(task) => task.id}
						aria-label="Horizontal"
					>
						{(task) => (
							<ListItem>
								<ListLabel>{task.label}</ListLabel>
							</ListItem>
						)}
					</List>
				</FixtureCase>
				<FixtureCase label="with descriptions">
					<List items={TASKS} getKey={(task) => task.id} aria-label="Described" className="w-full">
						{(task) => (
							<ListItem>
								<ListLabel>{task.label}</ListLabel>
								<ListDescription>{task.description}</ListDescription>
							</ListItem>
						)}
					</List>
				</FixtureCase>
				<FixtureCase label="disabled">
					<List items={TASKS} getKey={(task) => task.id} aria-label="Disabled" className="w-full">
						{(task) => (
							<ListItem>
								<ListLabel>{task.label}</ListLabel>
							</ListItem>
						)}
					</List>
				</FixtureCase>
				<FixtureCase label="long content, full width" wide>
					<List
						variant="outline"
						items={[
							{
								id: 'long',
								label:
									'A list label that is long enough to reach the edge of the row and truncate at a narrow width',
							},
						]}
						getKey={(item) => item.id}
						aria-label="Long"
						className="w-full"
					>
						{(item) => (
							<ListItem>
								<ListLabel>{item.label}</ListLabel>
							</ListItem>
						)}
					</List>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Tree">
				<FixtureCase label="default, one branch open">
					<Tree aria-label="Files">
						<TreeItem label="Documents" icon={<Folder />} defaultOpen>
							<TreeItem label="report.pdf" icon={<File />} />
							<TreeItem label="budget.xlsx" icon={<File />} current />
						</TreeItem>
						<TreeItem label="Photos" icon={<Folder />}>
							<TreeItem label="vacation.jpg" icon={<File />} />
						</TreeItem>
					</Tree>
				</FixtureCase>
				<FixtureCase label="indent, without icons">
					<Tree aria-label="Animals" indent>
						<TreeItem label="Animals" defaultOpen>
							<TreeItem label="Mammals" defaultOpen>
								<TreeItem label="Dog" />
								<TreeItem label="Cat" />
							</TreeItem>
							<TreeItem label="Birds" />
						</TreeItem>
					</Tree>
				</FixtureCase>
				<FixtureCase label="long content, full width" wide>
					<Tree aria-label="Long" className="w-full">
						<TreeItem
							label="A folder name that is long enough to truncate at the edge of a narrow container"
							icon={<Folder />}
							defaultOpen
						>
							<TreeItem
								label="a-file-name-that-is-also-long-enough-to-truncate-at-a-narrow-width.tsx"
								icon={<File />}
							/>
						</TreeItem>
					</Tree>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="JSON tree">
				<FixtureCase label="default">
					<JsonTree data={JSON_SAMPLE} />
				</FixtureCase>
				<FixtureCase label="collapsed">
					<JsonTree data={JSON_SAMPLE} defaultExpandDepth={0} />
				</FixtureCase>
				<FixtureCase label="array, fully expanded">
					<JsonTree
						data={['alpha', 'beta', 1, 2, true, null]}
						defaultExpandDepth={Number.POSITIVE_INFINITY}
					/>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Description list">
				{(['horizontal', 'vertical'] as const).map((orientation) => (
					<FixtureCase key={orientation} label={orientation}>
						<DescriptionList orientation={orientation} className="w-full">
							<DescriptionTerm>Name</DescriptionTerm>
							<DescriptionDetails>Wade Cooper</DescriptionDetails>
							<DescriptionTerm>Email</DescriptionTerm>
							<DescriptionDetails>wade@example.com</DescriptionDetails>
							<DescriptionTerm>Role</DescriptionTerm>
							<DescriptionDetails>Administrator</DescriptionDetails>
						</DescriptionList>
					</FixtureCase>
				))}
				<FixtureCase label="long content, full width" wide>
					<DescriptionList className="w-full">
						<DescriptionTerm>A term that is longer than usual</DescriptionTerm>
						<DescriptionDetails>
							A detail that is long enough to wrap onto more than one line in a narrow container and
							to fill the row in a wide one
						</DescriptionDetails>
					</DescriptionList>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Timeline">
				{(['solid', 'outline'] as const).map((variant) => (
					<FixtureCase key={variant} label={variant}>
						<Timeline variant={variant}>
							<TimelineItem>
								<TimelineTimestamp>Jan 2026</TimelineTimestamp>
								<TimelineTitle>Project kicked off</TimelineTitle>
								<TimelineDescription>Initial planning.</TimelineDescription>
							</TimelineItem>
							<TimelineItem status="info">
								<TimelineTimestamp>Feb 2026</TimelineTimestamp>
								<TimelineTitle>Design completed</TimelineTitle>
							</TimelineItem>
							<TimelineItem status="active" current>
								<TimelineTimestamp>Mar 2026</TimelineTimestamp>
								<TimelineTitle>Beta released</TimelineTitle>
							</TimelineItem>
						</Timeline>
					</FixtureCase>
				))}
				<FixtureCase label="horizontal">
					<Timeline orientation="horizontal">
						<TimelineItem status="active">
							<TimelineTitle>Plan</TimelineTitle>
						</TimelineItem>
						<TimelineItem status="warning">
							<TimelineTitle>Build</TimelineTitle>
						</TimelineItem>
						<TimelineItem status="error">
							<TimelineTitle>Ship</TimelineTitle>
						</TimelineItem>
					</Timeline>
				</FixtureCase>
				<FixtureCase label="long content, full width" wide>
					<Timeline>
						<TimelineItem>
							<TimelineTimestamp>Apr 2026</TimelineTimestamp>
							<TimelineTitle>
								A milestone title that is long enough to wrap at a narrow width
							</TimelineTitle>
							<TimelineDescription>
								A description that is long enough to wrap onto more than one line in a narrow
								container and to fill the row in a wide one.
							</TimelineDescription>
						</TimelineItem>
					</Timeline>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Stat">
				<FixtureCase label="trend up">
					<Stat>
						<StatLabel>Revenue</StatLabel>
						<StatValue>$12,345</StatValue>
						<StatDelta trend="up">
							<Icon icon={<ArrowUp />} size="xs" />
							12.5%
						</StatDelta>
						<StatDescription>vs. last month</StatDescription>
					</Stat>
				</FixtureCase>
				<FixtureCase label="trend down">
					<Stat>
						<StatLabel>Churn</StatLabel>
						<StatValue>2.4%</StatValue>
						<StatDelta trend="down">
							<Icon icon={<ArrowDown />} size="xs" />
							0.8%
						</StatDelta>
					</Stat>
				</FixtureCase>
				<FixtureCase label="value size, neutral">
					{(['sm', 'md', 'lg'] as const).map((size) => (
						<Stat key={size}>
							<StatLabel>{size}</StatLabel>
							<StatValue size={size}>$1,234</StatValue>
							<StatDelta>0%</StatDelta>
						</Stat>
					))}
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Sparkline">
				<FixtureCase label="line">
					{SPARK_COLORS.map((color) => (
						<Sparkline key={color} data={SERIES} color={color} aria-label={`${color} trend`} />
					))}
				</FixtureCase>
				<FixtureCase label="fill, end point">
					<Sparkline data={SERIES} color="blue" fill endPoint aria-label="Filled trend" />
				</FixtureCase>
				<FixtureCase label="bar">
					<Sparkline data={SERIES} shape="bar" color="amber" aria-label="Bars" />
				</FixtureCase>
				<FixtureCase label="size">
					{(['sm', 'md', 'lg'] as const).map((size) => (
						<Sparkline key={size} data={SERIES} size={size} aria-label={`${size} trend`} />
					))}
				</FixtureCase>
				<FixtureCase label="flat">
					<Sparkline data={[5, 5, 5, 5, 5]} aria-label="Flat trend" />
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Avatar">
				{AVATAR_VARIANTS.map((variant) => (
					<FixtureCase key={variant} label={variant}>
						{AVATAR_COLORS.map((color) => (
							<Avatar key={color} variant={variant} color={color} initials={color.slice(0, 2)} />
						))}
					</FixtureCase>
				))}
				<FixtureCase label="size">
					{AVATAR_SIZES.map((size) => (
						<Avatar key={size} size={size} initials="AB" />
					))}
				</FixtureCase>
				<FixtureCase label="status">
					<Avatar initials="AB" status="active" />
					<Avatar initials="CD" status="warning" />
					<Avatar initials="EF" status="inactive" />
				</FixtureCase>
				<FixtureCase label="empty">
					<Avatar alt="No image" />
				</FixtureCase>
				<FixtureCase label="group">
					{AVATAR_SIZES.map((size) => (
						<AvatarGroup key={size} size={size}>
							<Avatar initials="AB" />
							<Avatar initials="CD" color="blue" />
							<Avatar initials="EF" color="green" />
							<Avatar initials="+3" alt="3 more" />
						</AvatarGroup>
					))}
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Swatch">
				{SWATCH_SHAPES.map((shape) => (
					<FixtureCase key={shape} label={shape}>
						{SWATCH_VARIANTS.map((variant) => (
							<Swatch key={variant} shape={shape} variant={variant} size="xl" color="blue" />
						))}
					</FixtureCase>
				))}
				<FixtureCase label="size">
					{SWATCH_SIZES.map((size) => (
						<Swatch key={size} size={size} color="violet" />
					))}
				</FixtureCase>
				<FixtureCase label="color">
					{SWATCH_COLORS.map((color) => (
						<Swatch key={color} size="xl" color={color} />
					))}
					<Swatch size="xl" color="#7c3aed" />
					<Swatch size="xl" color="oklch(54.1% 0.281 293.009)" />
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Odometer">
				<FixtureCase label="integer">
					<Odometer value={1284} duration={0} className="text-2xl font-semibold" />
				</FixtureCase>
				<FixtureCase label="custom format">
					<Odometer
						value={48215.67}
						duration={0}
						format={(value) => `$${value.toFixed(2)}`}
						className="text-2xl font-semibold"
					/>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Pivot table">
				<FixtureCase label="default">
					<PivotTable
						rows={LOADS}
						keys={{ row: 'lane', column: 'period', value: 'loads' }}
						rowHeader="Lane"
					/>
				</FixtureCase>
				<FixtureCase label="totals, outline, striped">
					<PivotTable
						rows={LOADS}
						keys={{ row: 'lane', column: 'period', value: 'loads' }}
						aggregation="sum"
						rowHeader="Lane"
						totals="both"
						outline
						striped
					/>
				</FixtureCase>
			</FixtureGroup>
		</FixtureSheet>
	)
}
