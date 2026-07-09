import statesUrl from 'us-atlas/states-10m.json?url'
import { MapPlat } from '../../../../modules/map'
import { laToChicago } from './_data'
import { Example, RoutedMarker, useGeography } from './_shared'

export function Demo() {
	const states = useGeography(statesUrl)

	return (
		<Example title="Line haul">
			<MapPlat
				aria-label="Line haul"
				geography={states}
				projection="albers-usa"
				animate
				legend="right"
			>
				<RoutedMarker label="LA → CHI" start={laToChicago.start} end={laToChicago.end} />
			</MapPlat>
		</Example>
	)
}
