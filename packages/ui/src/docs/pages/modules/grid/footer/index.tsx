import { Example } from '../../../../kit/index.ts'
import RangeFigures from './range-figures.tsx'
import RowTotal from './row-total.tsx'
import SelectionSummary from './selection-summary.tsx'

export default function FooterTab() {
	return (
		<>
			<Example of={RowTotal} />
			<Example of={SelectionSummary} />
			<Example of={RangeFigures} />
		</>
	)
}
