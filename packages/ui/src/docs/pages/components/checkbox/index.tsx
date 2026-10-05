import api from 'virtual:docs/api/components/checkbox'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Disabled from './disabled.tsx'
import Group from './group.tsx'
import CheckboxPlayground from './playground.tsx'
import SelectAll from './select-all.tsx'
import WithDescription from './with-description.tsx'

export default function CheckboxPage() {
	return (
		<>
			<Playground of={CheckboxPlayground} api={api} />
			<Example of={WithDescription} />
			<Example of={Group} />
			<Example of={SelectAll} />
			<Example of={Disabled} />
			<ApiTable api={api} />
		</>
	)
}
