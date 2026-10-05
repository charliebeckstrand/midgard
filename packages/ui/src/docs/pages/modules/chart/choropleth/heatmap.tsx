import { ChoroplethChart } from 'ui/chart'
import type { MapGeography } from 'ui/map'
import states from 'us-atlas/states-10m.json'
import { heat, statePopulation } from '../data.ts'

export default function Heatmap() {
	return (
		<ChoroplethChart
			aria-label="Resident population by state, heatmap"
			geography={states as MapGeography}
			projection="albers-usa"
			legend="range"
			data={statePopulation}
			series={[
				{
					idKey: 'state',
					colorKey: 'people',
					colorRange: heat,
					colorName: 'Population',
				},
			]}
			regionId={(feature) => String(feature.properties?.name)}
			formatValue={(value) => `${value.toFixed(1)}M`}
		/>
	)
}
