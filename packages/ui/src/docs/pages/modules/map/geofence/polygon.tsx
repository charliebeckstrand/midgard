import { type LngLat, MapGeofence, MapPlat, MapPoints } from 'ui/map'
import { stateFrame } from '../data.ts'

const metros: { at: LngLat; label: string; loads: number }[] = [
	{ at: [-96.8, 32.78], label: 'Dallas', loads: 18 },
	{ at: [-95.37, 29.76], label: 'Houston', loads: 22 },
	{ at: [-98.49, 29.42], label: 'San Antonio', loads: 9 },
	{ at: [-97.74, 30.27], label: 'Austin', loads: 12 },
]

// Each metro with its readout.
const points = metros.map((metro) => ({ ...metro, detail: `${metro.loads} loads` }))

// The corridor between the metros, as a ring. A polygon zone needs no radius.
const triangle: LngLat[] = metros.map((metro) => metro.at)

// The map fits Texas alone.
const texas = stateFrame('Texas')

export default function Polygon() {
	return (
		<MapPlat
			aria-label="Texas Triangle corridor"
			geography={texas}
			projection="albers-usa"
			animate
			legend="right"
		>
			<MapGeofence label="Texas Triangle" boundary={triangle} color="green" detail="4 metros" />
			<MapPoints id="metro" label="Metros" points={points} color="rose" />
		</MapPlat>
	)
}
