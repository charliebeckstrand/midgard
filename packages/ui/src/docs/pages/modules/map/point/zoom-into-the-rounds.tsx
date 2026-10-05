import { Kbd } from 'ui/kbd'
import { MapPlat, MapPoints } from 'ui/map'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { PointerHint } from '../../../../kit/pointer-hint.tsx'
import { states } from '../data.ts'
import { deliveryStops, roundSummary } from './data.ts'

export default function ZoomIntoTheRounds() {
	return (
		<Stack gap="md">
			<Text>
				<PointerHint
					mouse={
						<>
							Hold <Kbd>shift</Kbd> and scroll to zoom. Drag to pan.
						</>
					}
					touch="Pinch to zoom. Drag with two fingers to pan."
				/>
			</Text>
			<MapPlat
				aria-label="Delivery rounds, zoomable"
				geography={states}
				projection="albers-usa"
				legend="right"
				zoom
			>
				<MapPoints
					id="round"
					label="Stops"
					points={deliveryStops}
					detail={`${deliveryStops.length} stops`}
					clusterDetail={roundSummary}
				/>
			</MapPlat>
		</Stack>
	)
}
