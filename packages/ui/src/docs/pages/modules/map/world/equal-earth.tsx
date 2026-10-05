import { MapPlat } from 'ui/map'
import { world } from './data.ts'

export default function EqualEarth() {
	// A ratio wider than the land, so that the outline of the globe shows at the sides.
	return (
		<MapPlat
			aria-label="Countries of the world on Equal Earth"
			geography={world}
			geographyObject="countries"
			projection="equal-earth"
			aspectRatio="5/2"
			graticule
			sphere
		/>
	)
}
