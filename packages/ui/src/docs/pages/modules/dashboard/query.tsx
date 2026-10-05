import { useCallback, useState } from 'react'
import { Alert } from 'ui/alert'
import { Badge } from 'ui/badge'
import { Button } from 'ui/button'
import {
	Dashboard,
	type DashboardLayoutItem,
	type DashboardSelection,
	DashboardTile,
} from 'ui/dashboard'
import { Flex } from 'ui/flex'
import { QueryBuilder, type QueryGroup, QuerySummary } from 'ui/query'
import { Spacer } from 'ui/spacer'
import { Stack } from 'ui/stack'
import { fields } from './data.ts'
import { FilterHint, Kpi, Orders, ProductMix, RevenueBars, Trend, Units } from './widgets.tsx'

const layout: DashboardLayoutItem[] = [
	{ id: 'units-trend', x: 0, y: 0, w: 8, h: 20 },
	{ id: 'revenue-trend', x: 8, y: 0, w: 8, h: 20 },
	{ id: 'units', x: 16, y: 0, w: 8, h: 20 },
	{ id: 'regions', x: 0, y: 20, w: 12 },
	{ id: 'mix', x: 12, y: 20, w: 12 },
	{ id: 'trend', x: 0, y: 47, w: 24, h: 40 },
	{ id: 'orders', x: 0, y: 87, w: 24, h: 44 },
]

const startFilter: QueryGroup = {
	id: 'filter',
	type: 'group',
	children: [{ id: 'revenue', type: 'rule', field: 'revenue', operator: 'gte', value: '200' }],
}

export default function Query() {
	const [editing, setEditing] = useState(false)

	// A narrow board shows a re-pack, and edit mode stops there. The edit control then hides.
	const [projected, setProjected] = useState(false)

	const project = useCallback((next: boolean) => {
		setProjected(next)

		if (next) setEditing(false)
	}, [])

	const [filter, setFilter] = useState<QueryGroup>(startFilter)

	const [selection, setSelection] = useState<DashboardSelection[]>([])

	return (
		<Stack gap="md">
			<Alert
				severity="info"
				closable
				className="w-full"
				description="A rule narrows the whole board, and a selected bar or slice narrows everything around it."
			/>
			<QueryBuilder fields={fields} value={filter} onValueChange={setFilter} />
			<Flex gap="sm" align="center" wrap>
				<QuerySummary value={filter} fields={fields} />
				{selection.map((item) => (
					<Badge key={`${item.source}:${item.field}`}>
						{item.field}: {item.values.join(', ')}
					</Badge>
				))}
				<Spacer />
				{selection.length > 0 && (
					<Button variant="plain" onClick={() => setSelection([])}>
						Clear selection
					</Button>
				)}
				<Button
					color={editing ? 'zinc' : 'blue'}
					hidden={projected}
					onClick={() => setEditing((live) => !live)}
				>
					{editing ? 'Done' : 'Edit layout'}
				</Button>
			</Flex>
			<Dashboard
				aria-label="Sales dashboard"
				editing={editing}
				onProjectedChange={project}
				layout={{ defaultValue: layout }}
				filter={{ value: filter, onValueChange: setFilter }}
				selection={{ value: selection, onValueChange: setSelection }}
			>
				<DashboardTile
					id="regions"
					expandable
					title="Revenue by region"
					description={<FilterHint mark="bar" />}
					ratio={16 / 9}
				>
					<RevenueBars by="region" />
				</DashboardTile>
				<DashboardTile
					id="mix"
					expandable
					title="Product mix"
					description={<FilterHint mark="slice" />}
					ratio={16 / 9}
				>
					<ProductMix />
				</DashboardTile>
				<DashboardTile id="units" title="Units sold" minWidth={160}>
					<Units />
				</DashboardTile>
				<DashboardTile id="units-trend" expandable title="Monthly units" minWidth={200}>
					<Kpi value="units" />
				</DashboardTile>
				<DashboardTile id="revenue-trend" expandable title="Monthly revenue" minWidth={200}>
					<Kpi value="revenue" />
				</DashboardTile>
				<DashboardTile
					id="trend"
					expandable
					title="Revenue by month"
					actions={
						<Badge color="green" variant="soft">
							Live
						</Badge>
					}
				>
					<Trend />
				</DashboardTile>
				<DashboardTile id="orders" expandable title="Orders" minWidth={480}>
					<Orders />
				</DashboardTile>
			</Dashboard>
		</Stack>
	)
}
