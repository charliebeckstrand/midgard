import { Example } from '../../../../kit/index.ts'
import Basic from './basic.tsx'
import WithMarkers from './with-markers.tsx'

export default function RouteTab() {
	return (
		<>
			<Example of={Basic} box="ratio" />
			<Example of={WithMarkers} box="ratio" />
		</>
	)
}
