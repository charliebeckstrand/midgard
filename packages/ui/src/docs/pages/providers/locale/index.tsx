import api from 'virtual:docs/api/providers/locale'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import LocaleProviderPresets from './locale-provider.tsx'
import LocalePlayground from './playground.tsx'

export default function LocalePage() {
	return (
		<>
			<Playground of={LocalePlayground} api={api} />
			<Example of={LocaleProviderPresets} />
			<ApiTable api={api} />
		</>
	)
}
