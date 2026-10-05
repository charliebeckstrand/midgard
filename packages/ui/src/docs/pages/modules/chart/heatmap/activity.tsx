import { HeatmapChart } from 'ui/chart'
import { activity, greens } from '../data.ts'

export default function Activity() {
	return (
		<HeatmapChart
			aria-label="Commits by weekday and hour"
			data={activity}
			series={[
				{
					xKey: 'hour',
					yKey: 'day',
					colorKey: 'commits',
					colorRange: greens,
					colorName: 'Commits',
				},
			]}
			formatValue={(value) => value.toFixed(0)}
		/>
	)
}
