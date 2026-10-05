import { useMemo, useState } from 'react'
import { Flex } from 'ui/flex'
import { MapPlat, MapPoints } from 'ui/map'
import { Select, SelectLabel, SelectOption } from 'ui/select'
import { Stack } from 'ui/stack'
import { stateFrame } from '../data.ts'
import { deliveryStops, roundSummary, stopStates } from './data.ts'

// The select offers each state that holds a stop.
const selectable = [...new Set(stopStates.filter((state) => state !== null))].sort()

export default function DeliveryRounds() {
	const [picked, setPicked] = useState<string | null>(null)

	// The picked stop, by its index in the stops that the map shows.
	const [stop, setStop] = useState<number | null>(null)

	const pickState = (state: string | null) => {
		setPicked(state)

		setStop(null)
	}

	// The map keeps its fit for the same geography object, so the frame is held.
	const frame = useMemo(() => stateFrame(picked), [picked])

	const stops = useMemo(
		() =>
			picked === null
				? deliveryStops
				: deliveryStops.filter((_, index) => stopStates[index] === picked),
		[picked],
	)

	return (
		<Stack gap="md">
			<Flex>
				<Select<string>
					aria-label="State"
					placeholder="Every round"
					value={picked}
					onValueChange={pickState}
					displayValue={(state: string) => state}
					clearable
				>
					{selectable.map((state) => (
						<SelectOption key={state} value={state}>
							<SelectLabel>{state}</SelectLabel>
						</SelectOption>
					))}
				</Select>
			</Flex>
			<MapPlat
				aria-label="Delivery rounds"
				geography={frame}
				projection="albers-usa"
				animate
				legend="right"
				selectedOverlay={stop === null ? null : { id: 'round', index: stop }}
			>
				<MapPoints
					id="round"
					label="Stops"
					points={stops}
					detail={`${stops.length} stops`}
					clusterDetail={roundSummary}
					// On the full country, a click opens the state of the summary. In one
					// state, a click picks the stop, and a second click clears it.
					onClick={
						picked === null
							? (_, index) => pickState(stopStates[index] ?? null)
							: (_, index) => setStop((prev) => (prev === index ? null : index))
					}
				/>
			</MapPlat>
		</Stack>
	)
}
