import { Example } from '../../../../kit/index.ts'
import ColumnManager from './column-manager.tsx'
import IconOnly from './icon-only.tsx'

export default function ToolbarTab() {
	return (
		<>
			<Example of={ColumnManager} />
			<Example of={IconOnly} />
		</>
	)
}
