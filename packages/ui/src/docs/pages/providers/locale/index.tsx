import api from 'virtual:docs/api/providers/locale'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import LocalePlayground from './playground.tsx'
import SwitchLocales from './switch-locales.tsx'

export default function LocalePage() {
	return (
		<>
			<Playground of={LocalePlayground} api={api} />
			<Example of={SwitchLocales} />
			<ApiTable api={api} />
		</>
	)
}
