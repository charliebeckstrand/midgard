import api from 'virtual:docs/api/components/time-ago'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import CustomFormat from './custom-format.tsx'
import CustomLocale from './custom-locale.tsx'
import Future from './future.tsx'
import Past from './past.tsx'
import TimeAgoPlayground from './playground.tsx'
import WithAbsoluteTime from './with-absolute-time.tsx'

export default function TimeAgoPage() {
	return (
		<>
			<Playground of={TimeAgoPlayground} api={api} />
			<Example of={Past} />
			<Example of={Future} />
			<Example of={CustomFormat} />
			<Example of={WithAbsoluteTime} />
			<Example of={CustomLocale} />
			<ApiTable api={api} />
		</>
	)
}
