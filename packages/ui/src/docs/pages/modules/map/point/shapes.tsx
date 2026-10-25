import { MapPlat, MapPoints } from 'ui/map'
import { states } from '../data.ts'
import { deliveryStops } from './data.ts'

// Two kinds of stop, told apart by shape as well as by color.
const depots = deliveryStops.filter((stop) => stop.parcels === undefined)

const drops = deliveryStops.filter((stop) => stop.parcels !== undefined)

export default function Shapes() {
	return (
		<MapPlat
			aria-label="Depots and stops"
			geography={states}
			projection="albers-usa"
			animate
			legend="right"
		>
			<MapPoints id="drops" label="Stops" points={drops} />

			<MapPoints id="depots" label="Depots" shape="square" points={depots} />
		</MapPlat>
	)
}
