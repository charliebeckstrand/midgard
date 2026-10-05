import api from 'virtual:docs/api/components/filters'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import FiltersPlayground from './playground.tsx'
import RenderProps from './render-props.tsx'
import SearchAndStatus from './search-and-status.tsx'
import WithDatePicker from './with-date-picker.tsx'

export default function FiltersPage() {
	return (
		<>
			<Playground of={FiltersPlayground} api={api} />
			<Example of={SearchAndStatus} />
			<Example of={WithDatePicker} />
			<Example of={RenderProps} />
			<ApiTable api={api} />
		</>
	)
}
