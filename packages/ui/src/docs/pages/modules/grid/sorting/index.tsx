import { Example } from '../../../../kit/index.ts'
import AnimatedSorting from './animated-sorting.tsx'
import ClientSorting from './client-sorting.tsx'
import ServerSorting from './server-sorting.tsx'
import SmartSorting from './smart-sorting.tsx'

export default function SortingTab() {
	return (
		<>
			<Example of={ServerSorting} />
			<Example of={ClientSorting} />
			<Example of={AnimatedSorting} />
			<Example of={SmartSorting} />
		</>
	)
}
