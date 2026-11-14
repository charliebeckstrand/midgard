import { useMemo } from 'react'
import { HeatmapChart } from 'ui/chart'
import { useIntl } from 'ui/primitives/intl'
import { useDateFormat } from 'ui/providers/locale'
import { activity, greens } from '../data.ts'

export default function Animated() {
	const { formatNumber } = useIntl()

	// The text of a time waits for hydration (`useDateFormat`). The chart draws
	// its columns after it measures its width, after hydration.
	const hourFormat = useDateFormat({ hour: 'numeric' })

	// The data holds each hour as a number. The column shows it in the form of the reader.
	const data = useMemo(
		() =>
			activity.map((datum) => ({
				...datum,
				hour: hourFormat?.format(new Date(2026, 0, 1, datum.hour)) ?? String(datum.hour),
			})),
		[hourFormat],
	)

	return (
		<HeatmapChart
			aria-label="Orders by weekday and hour"
			data={data}
			series={[
				{
					xKey: 'hour',
					yKey: 'day',
					colorKey: 'orders',
					colorRange: greens,
					colorName: 'Orders',
				},
			]}
			formatValue={(value) => formatNumber(value, { maximumFractionDigits: 0 })}
			animate
		/>
	)
}
