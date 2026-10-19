import api from 'virtual:docs/api/components/progress'
import { ApiTable, Example, PageTabs, Playground } from '../../../kit/index.ts'
import Color from './color.tsx'
import ProgressPlayground from './playground.tsx'
import Size from './size.tsx'

const TABS = ['Bar', 'Gauge']

export default function ProgressPage() {
	return (
		<>
			<PageTabs tabs={TABS}>
				<Playground of={ProgressPlayground} api={api} free={{ value: 60 }} />
				<Example of={Color} />
				<Example of={Size} />
			</PageTabs>
			<ApiTable api={api} />
		</>
	)
}
