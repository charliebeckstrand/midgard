import api from 'virtual:docs/api/components/control'
import { ApiTable, Example, FrameDefaults, Playground } from '../../../kit/index.ts'
import NestedFields from './nested-fields.tsx'
import ControlPlayground from './playground.tsx'
import Required from './required.tsx'
import Skeleton from './skeleton.tsx'

export default function ControlPage() {
	return (
		<FrameDefaults box="column">
			<Playground of={ControlPlayground} api={api} omit={['required']} />
			<Example of={Required} />
			<Example of={NestedFields} />
			<Example of={Skeleton} />
			<ApiTable api={api} />
		</FrameDefaults>
	)
}
