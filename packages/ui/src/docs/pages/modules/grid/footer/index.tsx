import { Example } from '../../../../kit/index.ts'
import RowTotal from './row-total.tsx'
import SelectionSummary from './selection-summary.tsx'

export default function FooterTab() {
	return (
		<>
			<Example of={RowTotal} />
			<Example of={SelectionSummary} />
		</>
	)
}
