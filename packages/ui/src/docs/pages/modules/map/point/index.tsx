import { Example } from '../../../../kit/index.ts'
import DeliveryRounds from './delivery-rounds.tsx'
import DepotsAndStops from './depots-and-stops.tsx'
import Warehouses from './warehouses.tsx'
import ZoomIntoTheRounds from './zoom-into-the-rounds.tsx'

export default function PointTab() {
	return (
		<>
			<Example of={Warehouses} surface />
			<Example of={DeliveryRounds} surface />
			<Example of={DepotsAndStops} surface />
			<Example of={ZoomIntoTheRounds} surface />
		</>
	)
}
