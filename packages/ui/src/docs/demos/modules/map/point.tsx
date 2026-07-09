import statesUrl from 'us-atlas/states-10m.json?url'
import { MapPlat, MapPoint } from '../../../../modules/map'
import { warehouses } from './_data'
import { Example, useGeography } from './_shared'

export function Demo() {
	const states = useGeography(statesUrl)

	return (
		<Example title="Warehouses">
			<MapPlat
				aria-label="Warehouse network"
				geography={states}
				projection="albers-usa"
				animate
				legend="right"
			>
				{warehouses.map((warehouse) => (
					<MapPoint
						key={warehouse.city}
						label={warehouse.city}
						at={warehouse.at}
						detail={warehouse.detail}
					/>
				))}
			</MapPlat>
		</Example>
	)
}
