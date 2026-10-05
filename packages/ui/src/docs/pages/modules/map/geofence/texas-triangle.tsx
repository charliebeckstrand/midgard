import { type LngLat, MapGeofence, MapPlat, MapPoints } from 'ui/map'
import { stateFrame } from '../data.ts'

const metros: { at: LngLat; label: string; detail: string }[] = [
	{ at: [-96.8, 32.78], label: 'Dallas', detail: '18 loads' },
	{ at: [-95.37, 29.76], label: 'Houston', detail: '22 loads' },
	{ at: [-98.49, 29.42], label: 'San Antonio', detail: '9 loads' },
	{ at: [-97.74, 30.27], label: 'Austin', detail: '12 loads' },
]

// The corridor between the metros, as a ring. A polygon zone needs no radius.
const triangle: LngLat[] = metros.map((metro) => metro.at)

// The map fits Texas alone.
const texas = stateFrame('Texas')

export default function TexasTriangle() {
	return (
		<MapPlat
			aria-label="Texas Triangle corridor"
			geography={texas}
			projection="albers-usa"
			animate
			legend="right"
		>
			<MapGeofence label="Texas Triangle" boundary={triangle} color="green" detail="4 metros" />
			<MapPoints id="metro" label="Metros" points={metros} color="rose" />
		</MapPlat>
	)
}
