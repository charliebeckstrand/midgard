import api from 'virtual:docs/api/components/search-input'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Controlled from './controlled.tsx'
import Disabled from './disabled.tsx'
import SearchInputPlayground from './playground.tsx'

export default function SearchInputPage() {
	return (
		<>
			<Playground of={SearchInputPlayground} api={api} />
			<Example of={Controlled} />
			<Example of={Disabled} />
			<ApiTable api={api} />
		</>
	)
}
