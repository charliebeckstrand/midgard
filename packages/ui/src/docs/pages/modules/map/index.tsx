import api from 'virtual:docs/api/modules/map'
import { ApiTable, Example, PageTabs, Playground } from '../../../kit/index.ts'
import PickAState from './pick-a-state.tsx'
import MapPlayground from './playground.tsx'

const TABS = ['Plat', 'Point', 'Marker', 'Route', 'Geofence', 'County', 'World']

export default function MapPage() {
	return (
		<>
			<PageTabs tabs={TABS}>
				<Playground of={MapPlayground} api={api} omit={['animate', 'binning']} surface />
				<Example of={PickAState} surface />
			</PageTabs>
			<ApiTable api={api} />
		</>
	)
}
