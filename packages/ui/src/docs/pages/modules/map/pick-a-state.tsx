import { useState } from 'react'
import { Flex } from 'ui/flex'
import { MapPlat } from 'ui/map'
import { Select, SelectLabel, SelectOption } from 'ui/select'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { stateName, states, timezones, zoneCategories } from './data.ts'

export default function PickAState() {
	// One value drives the map and the select, so they always show the same state.
	const [picked, setPicked] = useState<string | null>(null)

	const zone = timezones.find((row) => row.state === picked)?.zone

	// A click on the picked state clears the pick. A state with no timezone row
	// has no option in the select, so a click on it picks nothing.
	const pick = (state: string) => {
		if (!timezones.some((row) => row.state === state)) return

		setPicked((prev) => (prev === state ? null : state))
	}

	return (
		<Stack gap="md">
			<Flex>
				<Select<string>
					aria-label="State"
					placeholder="No state picked"
					value={picked}
					onValueChange={setPicked}
					displayValue={(state: string) => state}
					clearable
				>
					{timezones.map((row) => (
						<SelectOption key={row.state} value={row.state}>
							<SelectLabel>{row.state}</SelectLabel>
						</SelectOption>
					))}
				</Select>
			</Flex>
			<Text>{picked === null ? 'Pick a state.' : `${picked} — ${zone} time.`}</Text>
			<MapPlat
				aria-label="Timezones across America"
				geography={states}
				projection="albers-usa"
				data={timezones}
				regionKey="state"
				categoryKey="zone"
				categories={zoneCategories}
				regionId={stateName}
				onRegionClick={pick}
				selectedRegion={picked}
				legend="right"
			/>
		</Stack>
	)
}
