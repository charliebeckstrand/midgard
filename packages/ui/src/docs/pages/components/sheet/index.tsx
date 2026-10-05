import api from 'virtual:docs/api/components/sheet'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import InContainer from './in-container.tsx'
import SheetPlayground from './playground.tsx'
import WithForm from './with-form.tsx'

export default function SheetPage() {
	return (
		<>
			<Playground of={SheetPlayground} api={api} />
			<Example of={WithForm} />
			<Example of={InContainer} />
			<ApiTable api={api} />
		</>
	)
}
