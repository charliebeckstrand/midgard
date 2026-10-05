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
				<Playground of={ChartPlayground} api={api} omit={['animate']} surface />
				<Example of={NegativeValues} surface />
				<Example of={ReferenceLines} surface />
				<Example of={LegendPlacement} surface />
				<Example of={Animated} surface />
				<Example of={TooltipTrigger} surface />
				<Example of={TitleAndSubtitle} surface />
			</PageTabs>
			<ApiTable api={api} />
		</>
	)
}
