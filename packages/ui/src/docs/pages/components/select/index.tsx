import api from 'virtual:docs/api/components/select'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Controlled from './controlled.tsx'
import DisabledOption from './disabled-option.tsx'
import InAField from './in-a-field.tsx'
import OptionDescriptions from './option-descriptions.tsx'
import SelectPlayground from './playground.tsx'
import Validation from './validation.tsx'

export default function SelectPage() {
	return (
		<>
			<Playground of={SelectPlayground} api={api} omit={['open', 'required']} />
			<Example of={InAField} />
			<Example of={OptionDescriptions} />
			<Example of={DisabledOption} />
			<Example of={Validation} />
			<Example of={Controlled} />
			<ApiTable api={api} />
		</>
	)
}
