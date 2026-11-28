import api from 'virtual:docs/api/modules/map'
import { ApiTable, Example, FrameDefaults, PageTabs, Playground } from '../../../kit/index.ts'
import MapPlayground from './playground.tsx'
import QuantileBins from './quantile-bins.tsx'
import SelectAState from './select-a-state.tsx'
import SelectSeveralStates from './select-several-states.tsx'
import SplitTimeZones from './split-time-zones.tsx'

const TABS = ['Plat', 'Point', 'Marker', 'Route', 'Geofence', 'County', 'World']

export default function MapPage() {
	return (
		<>
			<FrameDefaults box="ratio">
				<PageTabs tabs={TABS}>
					<Playground of={MapPlayground} api={api} omit={['animate', 'binning']} />
					<Example of={SelectAState} />
					<Example of={SelectSeveralStates} />
					<Example of={SplitTimeZones} />
					<Example of={QuantileBins} />
				</PageTabs>
			</FrameDefaults>
			<ApiTable api={api} />
		</>
	)
}
