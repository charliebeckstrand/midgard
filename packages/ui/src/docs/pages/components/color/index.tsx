import api from 'virtual:docs/api/components/color'
import { ApiTable, Example, FrameDefaults, Playground } from '../../../kit/index.ts'
import CustomSwatches from './custom-swatches.tsx'
import InlinePanel from './inline-panel.tsx'
import ObjectValue from './object-value.tsx'
import ColorPlayground from './playground.tsx'

export default function ColorPage() {
	return (
		<FrameDefaults form>
			<Playground of={ColorPlayground} api={api} omit={['format']} />
			<Example of={InlinePanel} />
			<Example of={CustomSwatches} />
			<Example of={ObjectValue} />
			<ApiTable api={api} />
		</FrameDefaults>
	)
}
