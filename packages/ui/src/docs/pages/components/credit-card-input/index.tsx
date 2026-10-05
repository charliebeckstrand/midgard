import api from 'virtual:docs/api/components/credit-card-input'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import BrandDetection from './brand-detection.tsx'
import CardDetails from './card-details.tsx'
import Controlled from './controlled.tsx'
import Disabled from './disabled.tsx'
import Invalid from './invalid.tsx'
import CreditCardInputPlayground from './playground.tsx'

export default function CreditCardInputPage() {
	return (
		<>
			<Playground of={CreditCardInputPlayground} api={api} />
			<Example of={BrandDetection} />
			<Example of={CardDetails} />
			<Example of={Controlled} />
			<Example of={Disabled} />
			<Example of={Invalid} />
			<ApiTable api={api} />
		</>
	)
}
