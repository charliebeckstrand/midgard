import api from 'virtual:docs/api/components/copy-button'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import CustomIcon from './custom-icon.tsx'
import CopyButtonPlayground from './playground.tsx'

export default function CopyButtonPage() {
	return (
		<>
			<Playground of={CopyButtonPlayground} api={api} />
			<Example of={CustomIcon} />
			<ApiTable api={api} />
		</>
	)
}
