import { Example } from '../../../../kit/index.ts'
import BatchActions from './batch-actions.tsx'
import Selection from './selection.tsx'

export default function SelectionTab() {
	return (
		<>
			<Example of={Selection} />
			<Example of={BatchActions} />
		</>
	)
}
