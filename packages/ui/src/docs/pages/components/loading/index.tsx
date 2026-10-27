import api from 'virtual:docs/api/components/loading'
import { ApiTable, Example, PageTabs, Playground } from '../../../kit/index.ts'
import InsideAButton from './inside-a-button.tsx'
import LoadingPlayground from './playground.tsx'

const TABS = ['Spinner', 'Dots']

export default function LoadingPage() {
	return (
		<>
			<PageTabs tabs={TABS}>
				<Playground of={LoadingPlayground} api={api} />
				<Example of={InsideAButton} />
			</PageTabs>
			<ApiTable api={api} />
		</>
	)
}
