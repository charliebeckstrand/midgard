import api from 'virtual:docs/api/modules/events'
import { ApiTable, Example } from '../../../kit/index.ts'
import RecordAnEvent from './record-an-event.tsx'
import ReportABug from './report-a-bug.tsx'

export default function EventsPage() {
	return (
		<>
			<Example of={ReportABug} />
			<Example of={RecordAnEvent} />
			<ApiTable api={api} />
		</>
	)
}
