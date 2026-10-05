import { Example } from '../../../../kit/index.ts'
import AnimatedSorting from './animated-sorting.tsx'
import ClientSorting from './client-sorting.tsx'
import ServerSideSorting from './server-side-sorting.tsx'
import SmartSorting from './smart-sorting.tsx'

export default function SortingTab() {
	return (
		<>
			<Example of={ServerSideSorting} />
			<Example of={ClientSorting} />
			<Example of={AnimatedSorting} />
			<Example of={SmartSorting} />
		</>
	)
}
