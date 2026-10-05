import { useState } from 'react'
import { BarChart, type ChartLegendPlacement } from 'ui/chart'
import { Field, Label } from 'ui/fieldset'
import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'
import { legendPlacements, months } from './data.ts'

export default function LegendPlacement() {
	const [placement, setPlacement] = useState<ChartLegendPlacement>('right')

	return (
		<>
			<Field>
				<Label>Legend placement</Label>
				<Listbox<ChartLegendPlacement>
					value={placement}
					displayValue={(value) =>
						legendPlacements.find((option) => option.value === value)?.label ?? value
					}
					onValueChange={(value) => {
						if (value) setPlacement(value)
					}}
				>
					{legendPlacements.map((option) => (
						<ListboxOption key={option.value} value={option.value}>
							<ListboxLabel>{option.label}</ListboxLabel>
						</ListboxOption>
					))}
				</Listbox>
			</Field>
			<BarChart
				aria-label={`Revenue and costs by month, legend ${placement}`}
				data={months}
				series={[
					{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
					{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
				]}
				aspectRatio={16 / 9}
				legend={placement}
			/>
		</>
	)
}
