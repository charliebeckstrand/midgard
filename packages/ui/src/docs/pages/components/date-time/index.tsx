import api from 'virtual:docs/api/components/date-time'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import CalendarDay from './calendar-day.tsx'
import DateTimePlayground from './playground.tsx'
import ProviderZone from './provider-zone.tsx'
import ReaderZone from './reader-zone.tsx'

export default function DateTimePage() {
	return (
		<>
			<Playground of={DateTimePlayground} api={api} />
			<Example of={ReaderZone} />
			<Example of={ProviderZone} />
			<Example of={CalendarDay} />
			<ApiTable api={api} />
		</>
	)
}
