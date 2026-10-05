import { MapPlat } from 'ui/map'
import { world } from './data.ts'

export default function Mercator() {
	// A ratio taller than the land, so that the north edge of the globe shows above Greenland.
	return (
		<MapPlat
			aria-label="Countries of the world on Mercator"
			geography={world}
			geographyObject="countries"
			projection="mercator"
			aspectRatio="9/10"
			graticule
			sphere
		/>
	)
}
