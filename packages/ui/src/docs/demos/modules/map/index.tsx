import statesUrl from 'us-atlas/states-10m.json?url'
import { Stack } from '../../../../components/stack'
import { MapPlat } from '../../../../modules/map'
import { timezones, zoneCategories } from './_data'
import { Example, useGeography } from './_shared'

export function Demo() {
	const states = useGeography(statesUrl)

	return (
		<Stack gap="xl">
			<Example title="Timezones across America">
				<MapPlat
					aria-label="Timezones across America"
					geography={states}
					projection="albers-usa"
					data={timezones}
					regionKey="state"
					categoryKey="zone"
					categories={zoneCategories}
					regionId={(feature) => String(feature.properties?.name)}
					animate
					legend="right"
				/>
			</Example>
		</Stack>
	)
}
