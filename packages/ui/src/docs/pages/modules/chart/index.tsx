import api from 'virtual:docs/api/modules/chart'
import { ApiTable, Example, PageTabs, Playground } from '../../../kit/index.ts'
import Animated from './animated.tsx'
import LegendPlacement from './legend-placement.tsx'
import NegativeValues from './negative-values.tsx'
import ChartPlayground from './playground.tsx'
import ReferenceLines from './reference-lines.tsx'
import TitleAndSubtitle from './title-and-subtitle.tsx'
import TooltipTrigger from './tooltip-trigger.tsx'

const TABS = [
	'Bar',
	'Line',
	'Area',
	'Pie',
	'Donut',
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
				<Playground of={ChartPlayground} api={api} omit={['animate']} ratio />
				<Example of={NegativeValues} ratio />
				<Example of={ReferenceLines} ratio />
				<Example of={LegendPlacement} ratio />
				<Example of={Animated} ratio />
				<Example of={TooltipTrigger} ratio />
				<Example of={TitleAndSubtitle} ratio />
			</PageTabs>
			<ApiTable api={api} />
		</>
	)
}
