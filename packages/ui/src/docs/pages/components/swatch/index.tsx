import api from 'virtual:docs/api/components/swatch'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Color from './color.tsx'
import SwatchPlayground from './playground.tsx'

export default function SwatchPage() {
	return (
		<>
			<Playground of={SwatchPlayground} api={api} />
			<Example of={Color} />
			<ApiTable api={api} />
		</>
	)
}
