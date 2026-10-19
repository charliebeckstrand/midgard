import { Example } from '../../../../kit/index.ts'
import Circle from './circle.tsx'
import Polygon from './polygon.tsx'

export default function GeofenceTab() {
	return (
		<>
			<Example of={Circle} surface />
			<Example of={Polygon} surface />
		</>
	)
}
