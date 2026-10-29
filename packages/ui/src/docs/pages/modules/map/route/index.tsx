import { Example } from '../../../../kit/index.ts'
import Basic from './basic.tsx'
import WithMarkers from './with-markers.tsx'

export default function RouteTab() {
	return (
		<>
			<Example of={Basic} ratio />
			<Example of={WithMarkers} ratio />
		</>
	)
}
