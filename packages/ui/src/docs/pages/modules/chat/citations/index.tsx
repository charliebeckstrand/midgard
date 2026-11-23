import { Example } from '../../../../kit/index.ts'
import PreviewsOnHover from './previews-on-hover.tsx'
import SelectsInAChart from './selects-in-a-chart.tsx'
import SelectsInAMapAndAChart from './selects-in-a-map-and-a-chart.tsx'

export default function CitationsTab() {
	return (
		<>
			<Example of={SelectsInAChart} box="surface" />
			<Example of={SelectsInAMapAndAChart} box="surface" />
			<Example of={PreviewsOnHover} box="surface" />
		</>
	)
}
