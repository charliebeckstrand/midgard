import { Example } from '../../../../kit/index.ts'
import OpensAChartAndAMap from './opens-a-chart-and-a-map.tsx'
import SelectsInAChart from './selects-in-a-chart.tsx'
import SelectsInAMapAndAChart from './selects-in-a-map-and-a-chart.tsx'

export default function CitationsTab() {
	return (
		<>
			<Example of={SelectsInAChart} box="surface" />
			<Example of={SelectsInAMapAndAChart} box="surface" />
			<Example of={OpensAChartAndAMap} box="surface" />
		</>
	)
}
