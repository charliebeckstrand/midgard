import { Example } from '../../../../kit/index.ts'
import DeliveryRounds from './delivery-rounds.tsx'
import Warehouses from './warehouses.tsx'
import ZoomIntoTheRounds from './zoom-into-the-rounds.tsx'

export default function PointTab() {
	return (
		<>
			<Example of={Warehouses} surface />
			<Example of={DeliveryRounds} surface />
			<Example of={ZoomIntoTheRounds} surface />
		</>
	)
}
