import api from 'virtual:docs/api/components/aspect-ratio'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import CustomRatio from './custom-ratio.tsx'
import AspectRatioPlayground from './playground.tsx'
import Presets from './presets.tsx'
import { ratios } from './ratios.ts'

export default function AspectRatioPage() {
	return (
		<>
			<Playground of={AspectRatioPlayground} api={api} values={{ ratio: ratios }} />
			<Example of={Presets} />
			<Example of={CustomRatio} />
			<ApiTable api={api} />
		</>
	)
}
