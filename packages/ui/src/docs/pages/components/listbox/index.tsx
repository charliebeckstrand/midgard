import api from 'virtual:docs/api/components/listbox'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Controlled from './controlled.tsx'
import InAForm from './in-a-form.tsx'
import ListboxPlayground from './playground.tsx'
import WithPrefix from './with-prefix.tsx'

export default function ListboxPage() {
	return (
		<>
			<Playground of={ListboxPlayground} api={api} omit={['open', 'required']} />
			<Example of={WithPrefix} />
			<Example of={Controlled} />
			<Example of={InAForm} />
			<ApiTable api={api} />
		</>
	)
}
