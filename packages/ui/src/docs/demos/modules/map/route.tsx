import statesUrl from 'us-atlas/states-10m.json?url'
import { Stack } from '../../../../components/stack'
import { MapPlat } from '../../../../modules/map'
import { corridors, ikeaDestinations, ikeaHub } from './_data'
import { Example, RoutedLine, RoutedMarker, useGeography } from './_shared'

export function Demo() {
	const states = useGeography(statesUrl)

	return (
		<Stack gap="xl">
			<Example title="IKEA distribution network">
				<MapPlat
					aria-label="IKEA distribution network"
					geography={states}
					projection="albers-usa"
					animate
					legend="right"
				>
					{ikeaDestinations.map((destination) => (
						<RoutedMarker
							key={destination.city}
							label={`KC → ${destination.abbreviation}`}
							start={ikeaHub}
							end={destination.at}
						/>
					))}
				</MapPlat>
			</Example>

			<Example title="Long-haul corridors">
				<MapPlat
					aria-label="Long-haul corridors"
					geography={states}
					projection="albers-usa"
					animate
					legend="right"
				>
					{corridors.map((corridor) => (
						<RoutedLine
							key={corridor.city}
							label={corridor.abbreviation}
							start={corridor.start}
							end={corridor.end}
						/>
					))}
				</MapPlat>
			</Example>
		</Stack>
	)
}
