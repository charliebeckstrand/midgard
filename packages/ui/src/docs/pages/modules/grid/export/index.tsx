import { Example } from '../../../../kit/index.ts'
import Export from './export.tsx'
import ExportWithSelection from './export-with-selection.tsx'
import ToolbarOnly from './toolbar-only.tsx'

export default function ExportTab() {
	return (
		<>
			<Example of={Export} />
			<Example of={ExportWithSelection} />
			<Example of={ToolbarOnly} />
		</>
	)
}
