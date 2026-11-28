import api from 'virtual:docs/api/modules/chart'
import { ApiTable, Example, FrameDefaults, PageTabs, Playground } from '../../../kit/index.ts'
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
			<FrameDefaults box="ratio">
				<PageTabs tabs={TABS}>
					<Playground of={ChartPlayground} api={api} omit={['animate']} />
					<Example of={NegativeValues} />
					<Example of={ReferenceLines} />
					<Example of={LegendPlacement} />
					<Example of={Animated} />
					<Example of={TooltipTrigger} />
					<Example of={TitleAndSubtitle} />
					<Example of={SelectACategory} />
					<Example of={ContextMenuItems} />
				</PageTabs>
			</FrameDefaults>
			<ApiTable api={api} />
		</>
	)
}
