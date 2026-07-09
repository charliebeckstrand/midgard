import { useEffect, useState } from 'react'
import statesUrl from 'us-atlas/states-10m.json?url'
import { Stack } from '../../../../components/stack'
import { ChoroplethChart } from '../../../../modules/chart'
import type { MapGeography } from '../../../../modules/map'
import { code } from '../../../engine'
import { heat, statePopulation } from './_data'
import { Example } from './_examples'

// Atlas data stays out of the package: fetch the us-atlas TopoJSON as a static
// asset on first render, the same shape a consumer's lazily-loaded geography
// takes. `null` until it lands — the choropleth reserves its frame meanwhile.
function useGeography(url: string): MapGeography | null {
	const [geography, setGeography] = useState<MapGeography | null>(null)

	useEffect(() => {
		let cancelled = false

		fetch(url)
			.then((response) => response.json())
			.then((json: MapGeography) => {
				if (!cancelled) setGeography(json)
			})
			.catch(() => {})

		return () => {
			cancelled = true
		}
	}, [url])

	return geography
}

export function Demo() {
	const states = useGeography(statesUrl)

	return (
		<Stack gap="xl">
			<Example
				title="Heatmap"
				code={code`<ChoroplethChart legend="range" series={[{ …, colorRange: heat }]} … />`}
			>
				<ChoroplethChart
					aria-label="Resident population by state, heatmap"
					geography={states}
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
			</Example>
		</Stack>
	)
}
