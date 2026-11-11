import { MapPlat, MapPoints } from 'ui/map'
import { stateFrame } from '../data.ts'
import { deliveryStops } from './data.ts'

// The map fits the Georgia round alone. On the full country, each depot merges
// with the stops near it into a summary, and a summary is a circle. Here the
// depot stands apart from its stops, so its square shows.
const round = deliveryStops.filter((stop) => stop.state === 'Georgia')

// Two kinds of stop, told apart by shape as well as by color.
const depots = round.filter((stop) => stop.parcels === undefined)

const drops = round.filter((stop) => stop.parcels !== undefined)

const georgia = stateFrame('Georgia')

export default function Shapes() {
	return (
		<MapPlat
			aria-label="Depots and stops"
			geography={georgia}
			projection="albers-usa"
			animate
			legend="right"
		>
			<MapPoints id="drops" label="Stops" points={drops} />

			<MapPoints id="depots" label="Depots" shape="square" points={depots} />
		</MapPlat>
	)
}
