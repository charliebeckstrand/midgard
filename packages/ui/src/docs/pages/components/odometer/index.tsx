import api from 'virtual:docs/api/components/odometer'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Currency from './currency.tsx'
import Instant from './instant.tsx'
import OdometerPlayground from './playground.tsx'

export default function OdometerPage() {
	return (
		<>
			<Playground of={OdometerPlayground} api={api} />
			<Example of={Currency} />
			<Example of={Instant} />
			<ApiTable api={api} />
		</>
	)
}
