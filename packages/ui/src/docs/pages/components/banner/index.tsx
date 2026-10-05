import api from 'virtual:docs/api/components/banner'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Closable from './closable.tsx'
import BannerPlayground from './playground.tsx'
import WithActions from './with-actions.tsx'
import WithDescription from './with-description.tsx'

export default function BannerPage() {
	return (
		<>
			<Playground
				of={BannerPlayground}
				api={api}
				omit={[
					'open',
					'defaultOpen',
					'closable',
					'sticky',
					'titleLevel',
					'announceOnMount',
					'color',
				]}
			/>
			<Example of={WithDescription} />
			<Example of={Closable} />
			<Example of={WithActions} />
			<ApiTable api={api} />
		</>
	)
}
