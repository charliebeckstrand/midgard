import api from 'virtual:docs/api/components/icon'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import CustomSize from './custom-size.tsx'
import Mirror from './mirror.tsx'
import IconPlayground from './playground.tsx'
import Sizes from './sizes.tsx'

export default function IconPage() {
	return (
		<>
			<Playground of={IconPlayground} api={api} omit={['mirror']} />
			<Example of={Sizes} />
			<Example of={CustomSize} />
			<Example of={Mirror} />
			<ApiTable api={api} />
		</>
	)
}
