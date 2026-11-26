import api from 'virtual:docs/api/components/alert'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Closable from './closable.tsx'
import Color from './color.tsx'
import AlertPlayground from './playground.tsx'
import WithActions from './with-actions.tsx'
import WithDescription from './with-description.tsx'

export default function AlertPage() {
	return (
		<>
			<Playground
				of={AlertPlayground}
				api={api}
				omit={['open', 'closable', 'announceOnMount', 'color']}
			/>
			<Example of={WithDescription} />
			<Example of={Closable} />
			<Example of={WithActions} />
			<Example of={Color} />
			<ApiTable api={api} />
		</>
	)
}
