import api from 'virtual:docs/api/modules/chart'
import { ApiTable, Example, PageTabs, Playground } from '../../../kit/index.ts'
import Animated from './animated.tsx'
import ContextMenuItems from './context-menu-items.tsx'
import LegendPlacement from './legend-placement.tsx'
import NegativeValues from './negative-values.tsx'
import ChartPlayground from './playground.tsx'
import ReferenceLines from './reference-lines.tsx'
import SelectACategory from './select-a-category.tsx'
import TitleAndSubtitle from './title-and-subtitle.tsx'
import TooltipTrigger from './tooltip-trigger.tsx'

const TABS = [
	'Bar',
	'Line',
	'Area',
	'Pie',
	'Donut',
	'Seat',
	'Combo',
	'Scatter',
	'Bubble',
	'Heatmap',
	'Choropleth',
]

export default function ChartPage() {
	return (
		<>
			<PageTabs tabs={TABS}>
				<Playground of={ChartPlayground} api={api} omit={['animate']} box="ratio" />
				<Example of={NegativeValues} box="ratio" />
				<Example of={ReferenceLines} box="ratio" />
				<Example of={LegendPlacement} box="ratio" />
				<Example of={Animated} box="ratio" />
				<Example of={TooltipTrigger} box="ratio" />
				<Example of={TitleAndSubtitle} box="ratio" />
				<Example of={SelectACategory} box="ratio" />
				<Example of={ContextMenuItems} box="ratio" />
			</PageTabs>
			<ApiTable api={api} />
		</>
	)
}
