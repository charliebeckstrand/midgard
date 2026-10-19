import { ScatterChart } from 'ui/chart'
import { stops } from '../data.ts'

export default function Animated() {
	return (
		<ScatterChart
			aria-label="Dwell and handling time by stop distance"
			data={stops}
			series={[
				{ xKey: 'distance', yKey: 'dwell', yName: 'Dwell' },
				{ xKey: 'distance', yKey: 'handling', yName: 'Handling' },
			]}
			animate
		/>
	)
}
