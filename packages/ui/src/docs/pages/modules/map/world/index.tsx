import { Example } from '../../../../kit/index.ts'
import EqualEarth from './equal-earth.tsx'
import Mercator from './mercator.tsx'

export default function WorldTab() {
	return (
		<>
			<Example of={EqualEarth} ratio />
			<Example of={Mercator} ratio />
		</>
	)
}
