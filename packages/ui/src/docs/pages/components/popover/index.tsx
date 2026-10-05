import api from 'virtual:docs/api/components/popover'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Glass from './glass.tsx'
import PopoverPlayground from './playground.tsx'
import WithAForm from './with-a-form.tsx'

export default function PopoverPage() {
	return (
		<>
			<Playground of={PopoverPlayground} api={api} omit={['open', 'defaultOpen']} />
			<Example of={WithAForm} />
			<Example of={Glass} />
			<ApiTable api={api} />
		</>
	)
}
