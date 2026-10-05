import { Example } from '../../../../kit/index.ts'
import Empty from './empty.tsx'
import ErrorState from './error.tsx'
import Loading from './loading.tsx'

export default function StateTab() {
	return (
		<>
			<Example of={Loading} />
			<Example of={Empty} />
			<Example of={ErrorState} />
		</>
	)
}
