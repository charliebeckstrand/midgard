import { useState } from 'react'
import { type ChartLegendPlacement, PieChart } from 'ui/chart'
import { Field, Label } from 'ui/fieldset'
import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'
import { legendPlacements, sources } from '../data.ts'

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
			<PieChart
				aria-label={`Traffic by source, legend ${placement}`}
				data={sources}
				series={[{ xKey: 'source', yKey: 'visits' }]}
				legend={placement}
			/>
		</>
	)
}
