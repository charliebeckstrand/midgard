import api from 'virtual:docs/api/modules/map'
import { ApiTable, Example, PageTabs, Playground } from '../../../kit/index.ts'
import MapPlayground from './playground.tsx'
import QuantileBins from './quantile-bins.tsx'
import SelectAState from './select-a-state.tsx'
import SelectSeveralStates from './select-several-states.tsx'
import SplitTimeZones from './split-time-zones.tsx'

const TABS = ['Plat', 'Point', 'Marker', 'Route', 'Geofence', 'County', 'World']

export default function MapPage() {
	return (
		<>
			<PageTabs tabs={TABS}>
				<Playground of={MapPlayground} api={api} omit={['animate', 'binning']} box="ratio" />
				<Example of={SelectAState} box="ratio" />
				<Example of={SelectSeveralStates} box="ratio" />
				<Example of={SplitTimeZones} box="ratio" />
				<Example of={QuantileBins} box="ratio" />
			</PageTabs>
			<ApiTable api={api} />
		</>
	)
}
