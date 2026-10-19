import api from 'virtual:docs/api/modules/map'
import { ApiTable, Example, PageTabs, Playground } from '../../../kit/index.ts'
import MapPlayground from './playground.tsx'
import SelectAState from './select-a-state.tsx'

const TABS = ['Plat', 'Point', 'Marker', 'Route', 'Geofence', 'County', 'World']

export default function MapPage() {
	return (
		<>
			<PageTabs tabs={TABS}>
				<Playground of={MapPlayground} api={api} omit={['animate', 'binning']} surface />
				<Example of={SelectAState} surface />
			</PageTabs>
			<ApiTable api={api} />
		</>
	)
}
