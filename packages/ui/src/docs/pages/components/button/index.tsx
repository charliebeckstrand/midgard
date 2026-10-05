import api from 'virtual:docs/api/components/button'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Disabled from './disabled.tsx'
import IconOnly from './icon-only.tsx'
import ButtonPlayground from './playground.tsx'
import WithIcon from './with-icon.tsx'

export default function ButtonPage() {
	return (
		<>
			<Playground of={ButtonPlayground} api={api} />
			<Example of={WithIcon} />
			<Example of={IconOnly} />
			<Example of={Disabled} />
			<ApiTable api={api} />
		</>
	)
}
