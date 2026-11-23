import { Example } from '../../../../kit/index.ts'
import SelectsInAChart from './selects-in-a-chart.tsx'
import SelectsInAMapAndAChart from './selects-in-a-map-and-a-chart.tsx'

export default function CitationsTab() {
	return (
		<>
			<Example of={SelectsInAChart} ratio />
			<Example of={SelectsInAMapAndAChart} surface />
		</>
	)
}
