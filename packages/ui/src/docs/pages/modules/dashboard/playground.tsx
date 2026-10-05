import {
	Dashboard,
	type DashboardLayoutItem,
	type DashboardProps,
	DashboardTile,
} from 'ui/dashboard'
import { FilterHint, Kpi, ProductMix, RevenueBars, Units } from './widgets.tsx'

const layout: DashboardLayoutItem[] = [
	{ id: 'revenue', x: 0, y: 0, w: 8, h: 20 },
	{ id: 'units', x: 8, y: 0, w: 8, h: 20 },
	{ id: 'sold', x: 16, y: 0, w: 8, h: 20 },
	{ id: 'regions', x: 0, y: 20, w: 12 },
	{ id: 'mix', x: 12, y: 20, w: 12 },
]

export default function DashboardPlayground(props: DashboardProps) {
	return (
		<Dashboard {...props} aria-label="Sales dashboard" layout={{ defaultValue: layout }}>
			<DashboardTile id="revenue" expandable title="Monthly revenue" minWidth={200}>
				<Kpi value="revenue" />
			</DashboardTile>
			<DashboardTile id="units" expandable title="Monthly units" minWidth={200}>
				<Kpi value="units" />
			</DashboardTile>
			<DashboardTile id="sold" title="Units sold" minWidth={160}>
				<Units />
			</DashboardTile>
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
		</Dashboard>
	)
}
