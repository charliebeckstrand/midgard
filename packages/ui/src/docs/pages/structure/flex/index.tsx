import api from 'virtual:docs/api/structure/flex'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import AlignAndJustify from './align-and-justify.tsx'
import ComposedWithButtons from './composed-with-buttons.tsx'
import Equal from './equal.tsx'
import FlexPlayground from './playground.tsx'
import ResponsiveDirection from './responsive-direction.tsx'
import Row from './row.tsx'
import Wrap from './wrap.tsx'

export default function FlexPage() {
	return (
		<>
			<Playground of={FlexPlayground} api={api} omit={['as', 'wrap']} />
			<Example of={Wrap} />
			<Example of={Row} />
			<Example of={AlignAndJustify} />
			<Example of={Equal} />
			<Example of={ResponsiveDirection} />
			<Example of={ComposedWithButtons} />
			<ApiTable api={api} />
		</>
	)
}
