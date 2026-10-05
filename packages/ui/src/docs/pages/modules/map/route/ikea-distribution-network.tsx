import { type LngLat, MapMarker, MapPlat } from 'ui/map'
import { states } from '../data.ts'

// A distribution network that is not real, from one hub in Kansas City.
const hub: LngLat = [-94.58, 39.1]

const destinations: { abbreviation: string; at: LngLat }[] = [
	{ abbreviation: 'LA', at: [-118.24, 34.05] },
	{ abbreviation: 'SEA', at: [-122.33, 47.61] },
	{ abbreviation: 'NYC', at: [-74.0, 40.71] },
	{ abbreviation: 'ATL', at: [-84.39, 33.75] },
]

export default function IkeaDistributionNetwork() {
	return (
		<MapPlat
			aria-label="IKEA distribution network"
			geography={states}
			projection="albers-usa"
			animate
			legend="right"
		>
			{destinations.map((destination) => (
				<MapMarker
					key={destination.abbreviation}
					label={`KC → ${destination.abbreviation}`}
					start={hub}
					end={destination.at}
				/>
			))}
		</MapPlat>
	)
}
