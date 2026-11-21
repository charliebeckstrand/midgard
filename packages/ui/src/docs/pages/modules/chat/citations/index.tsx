import { Example } from '../../../../kit/index.ts'
import SelectsInAChart from './selects-in-a-chart.tsx'
import SelectsInADashboard from './selects-in-a-dashboard.tsx'

export default function CitationsTab() {
	return (
		<>
			<Example of={SelectsInAChart} surface />
			<Example of={SelectsInADashboard} surface />
		</>
	)
}
