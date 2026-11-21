import { useState } from 'react'
import { Flex } from 'ui/flex'
import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'
import { MapPlat } from 'ui/map'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { stateLabel } from '../../../data/us-states.ts'
import { labelOfState, stateName, states, timezones, zoneCategories } from './data.ts'

const zoned = new Set(timezones.map((row) => row.state))

// A state with no time zone row has no option in the list, so the map disables
// it: it takes no pointer cursor, and a click on it picks nothing.
const unzoned = (state: string) => !zoned.has(state)

export default function SelectSeveralStates() {
	// One list drives the map and the listbox, so they always show the same states.
	const [picked, setPicked] = useState<string[]>(['Colorado', 'Utah'])

	// A click on a state adds it to the picks, and a click on a picked state removes it.
	const toggle = (state: string) =>
		setPicked((prev) =>
			prev.includes(state) ? prev.filter((held) => held !== state) : [...prev, state],
		)

	return (
		<Stack gap="md">
			<Flex>
				<Listbox<string>
					multiple
					aria-label="States"
					placeholder="Select states"
					value={picked}
					onValueChange={setPicked}
					displayValue={labelOfState}
				>
					{timezones.map((row) => (
						<ListboxOption key={row.state} value={row.state}>
							<ListboxLabel>{labelOfState(row.state)}</ListboxLabel>
						</ListboxOption>
					))}
				</Listbox>
			</Flex>
			<Text>Value: {picked.length > 0 ? picked.map(labelOfState).join(', ') : 'Empty'}</Text>
			<MapPlat
				aria-label="US time zones"
				geography={states}
				projection="albers-usa"
				data={timezones}
				regionKey="state"
				categoryKey="zone"
				colorName="Time zone"
				categories={zoneCategories}
				regionId={stateName}
				regionLabel={stateLabel}
				onRegionClick={toggle}
				isRegionDisabled={unzoned}
				selectedRegions={picked}
				legend="right"
			/>
		</Stack>
	)
}
