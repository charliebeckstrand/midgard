import api from 'virtual:docs/api/components/mask-input'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Controlled from './controlled.tsx'
import CustomFormat from './custom-format.tsx'
import Disabled from './disabled.tsx'
import InternationalPhone from './international-phone.tsx'
import MaskInputPlayground from './playground.tsx'
import PostalCode from './postal-code.tsx'

export default function MaskInputPage() {
	return (
		<>
			<Playground of={MaskInputPlayground} api={api} />
			<Example of={InternationalPhone} />
			<Example of={PostalCode} />
			<Example of={CustomFormat} />
			<Example of={Controlled} />
			<Example of={Disabled} />
			<ApiTable api={api} />
		</>
	)
}
