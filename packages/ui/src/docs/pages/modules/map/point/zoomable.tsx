import { Kbd } from 'ui/kbd'
import { MapPlat, MapPoints } from 'ui/map'
import { useIntl } from 'ui/primitives/intl'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { PointerHint } from '../../../../kit/pointer-hint.tsx'
import { miles, states } from '../data.ts'
import { deliveryStops } from './data.ts'

export default function Zoomable() {
	const intl = useIntl()

	return (
		<Stack gap="md">
			<Text>
				<PointerHint
					mouseText={
						<>
							Hold <Kbd>Shift</Kbd> and scroll to zoom. Drag to pan.
						</>
					}
					touchText="Pinch to zoom. Drag with two fingers to pan."
				/>
			</Text>
			<MapPlat
				aria-label="Delivery rounds"
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
					clusterDetail={(count, span) => `${count} stops · ${miles(span, intl)} across`}
				/>
			</MapPlat>
		</Stack>
	)
}
