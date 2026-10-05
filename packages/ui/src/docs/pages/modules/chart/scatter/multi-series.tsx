import { ScatterChart } from 'ui/chart'
import { stops } from '../data.ts'

export default function MultiSeries() {
	return (
		<ScatterChart
			aria-label="Dwell and handling time against stop distance"
			data={stops}
			series={[
				{ xKey: 'distance', yKey: 'dwell', yName: 'Dwell' },
				{ xKey: 'distance', yKey: 'handling', yName: 'Handling' },
			]}
			axes={{ x: { format: (value) => `${value} mi` } }}
			crosshair
		/>
	)
}
