import api from 'virtual:docs/api/components/calendar'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Controlled from './controlled.tsx'
import Locale from './locale.tsx'
import MinAndMax from './min-and-max.tsx'
import CalendarPlayground from './playground.tsx'
import Range from './range.tsx'

export default function CalendarPage() {
	return (
		<>
			<Playground of={CalendarPlayground} api={api} omit={['multiselectable']} />
			<Example of={Controlled} />
			<Example of={MinAndMax} />
			<Example of={Range} />
			<Example of={Locale} />
			<ApiTable api={api} />
		</>
	)
}
