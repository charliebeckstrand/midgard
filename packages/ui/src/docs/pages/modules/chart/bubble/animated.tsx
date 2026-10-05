import { BubbleChart } from 'ui/chart'
import { stops } from '../data.ts'

export default function Animated() {
	return (
		<BubbleChart
			aria-label="Dwell against distance, sized by weight, animated"
			data={stops}
			series={[
				{
					xKey: 'distance',
					yKey: 'dwell',
					sizeKey: 'weight',
					sizeName: 'Weight',
					yName: 'Stops',
				},
			]}
			axes={{ x: { format: (value) => `${value} mi` } }}
			animate
		/>
	)
}
