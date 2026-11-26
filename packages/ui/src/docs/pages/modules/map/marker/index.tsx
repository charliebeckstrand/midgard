import { Example } from '../../../../kit/index.ts'
import Basic from './basic.tsx'
import RoutedMarkers from './routed-markers.tsx'

export default function MarkerTab() {
	return (
		<>
			<Example of={Basic} box="ratio" />
			<Example of={RoutedMarkers} box="ratio" />
		</>
	)
}
