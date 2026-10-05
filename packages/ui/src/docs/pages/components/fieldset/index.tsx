import api from 'virtual:docs/api/components/fieldset'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Disabled from './disabled.tsx'
import LabelWithHint from './label-with-hint.tsx'
import FieldsetPlayground from './playground.tsx'
import Severity from './severity.tsx'

export default function FieldsetPage() {
	return (
		<>
			<Playground of={FieldsetPlayground} api={api} />
			<Example of={Severity} />
			<Example of={LabelWithHint} />
			<Example of={Disabled} />
			<ApiTable api={api} />
		</>
	)
}
