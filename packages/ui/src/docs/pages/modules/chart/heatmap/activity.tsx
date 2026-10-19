import { HeatmapChart } from 'ui/chart'
import { activity, greens } from '../data.ts'

export default function Activity() {
	return (
		<HeatmapChart
			aria-label="Orders by weekday and hour"
			data={activity}
			series={[
				{
					xKey: 'hour',
					yKey: 'day',
					colorKey: 'orders',
					colorRange: greens,
					colorName: 'Orders',
				},
			]}
			formatValue={(value) => value.toFixed(0)}
		/>
	)
}
