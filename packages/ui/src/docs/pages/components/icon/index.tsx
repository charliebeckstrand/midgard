import api from 'virtual:docs/api/components/icon'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import CustomSize from './custom-size.tsx'
import IconPlayground from './playground.tsx'
import Sizes from './sizes.tsx'

export default function IconPage() {
	return (
		<>
			<Playground of={IconPlayground} api={api} />
			<Example of={Sizes} />
			<Example of={CustomSize} />
			<ApiTable api={api} />
		</>
	)
}
