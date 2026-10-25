import { ArrowLeft } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Button } from 'ui/button'
import { Flex } from 'ui/flex'
import { Icon } from 'ui/icon'
import { MapPlat } from 'ui/map'
import { Stack } from 'ui/stack'
import { stateLabel } from '../../../../data/us-states.ts'
import { useFail } from '../../../../kit/fail.ts'
import { stateFrame, stateName, states, timezones, zoneCategories } from '../data.ts'
import { type CountiesByState, loadCounties } from './data.ts'

type DrilledState = { name: string; label: string; fips: string }

export default function DrillIntoCounties() {
	const [drilled, setDrilled] = useState<DrilledState | null>(null)

	const [county, setCounty] = useState<string | null>(null)

	const [byState, setByState] = useState<CountiesByState | null>(null)

	// A hold on a state loads the counties, so they are ready for the click. A
	// load that fails here does nothing. The click shows the failure.
	const warmCounties = () => loadCounties().catch(() => {})

	const fail = useFail()

	// When the load fails, the error boundary shows the failure.
	const drill = (name: string, index: number) => {
		const state = states.features[index]

		setDrilled({
			name,
			label: state === undefined ? name : stateLabel(state),
			fips: String(state?.id ?? ''),
		})

		setCounty(null)

		loadCounties().then(setByState, fail)
	}

	const mapRef = useRef<HTMLDivElement>(null)

	// The back button leaves with the drill, so it hands focus to the map first.
	// The map stays mounted across the change, so focus stays on it.
	const back = () => {
		mapRef.current?.querySelector<HTMLElement>('[data-slot="map-plot"]')?.focus()

		setDrilled(null)
	}

	const counties = drilled === null ? null : (byState?.get(drilled.fips) ?? null)

	// The state shows until its counties load.
	const frame = useMemo(() => stateFrame(drilled?.name ?? null), [drilled])

	// Each county gets a row, so the map names the county under the pointer. The
	// atlas has no measure, so the category of each county is its state.
	const rows = useMemo(() => {
		const state = drilled?.label ?? ''

		return (counties?.features ?? []).map((feature) => ({ id: String(feature.id), state }))
	}, [counties, drilled])

	return (
		<Stack gap="md">
			{drilled ? (
				<Flex>
					<Button variant="plain" prefix={<Icon icon={<ArrowLeft />} />} onClick={back}>
						All states
					</Button>
				</Flex>
			) : null}
			{drilled !== null ? (
				<MapPlat
					ref={mapRef}
					aria-label={`Counties of ${drilled.label}`}
					geography={counties ?? frame}
					projection="albers-usa"
					data={rows}
					regionKey="id"
					categoryKey="state"
					onRegionClick={(id) => setCounty((prev) => (prev === id ? null : id))}
					selectedRegion={county}
				/>
			) : (
				<MapPlat
					ref={mapRef}
					aria-label="US states"
					geography={states}
					projection="albers-usa"
					data={timezones}
					regionKey="state"
					categoryKey="zone"
					categories={zoneCategories}
					regionId={stateName}
					regionLabel={stateLabel}
					onRegionPreload={warmCounties}
					onRegionClick={drill}
					legend="right"
				/>
			)}
		</Stack>
	)
}
