import { Kbd } from 'ui/kbd'
import { MapPlat, MapPoints } from 'ui/map'
import { useIntl } from 'ui/primitives/intl'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { PointerHint } from '../../../../kit/pointer-hint.tsx'
import { miles, states } from '../data.ts'
import { deliveryStops } from './data.ts'

export default function OverviewInset() {
	const intl = useIntl()

	return (
		<Stack gap="md">
			<Text>
				<PointerHint
					mouseText={
						<>
							Zoom in with <Kbd>Shift</Kbd> and the wheel, or the buttons. Then click or drag the
							overview in the corner to move the view.
						</>
					}
					touchText="Pinch or use the buttons to zoom in. Then tap or drag the overview in the corner to move the view."
				/>
			</Text>
			<MapPlat
				aria-label="Delivery rounds"
				geography={states}
				projection="albers-usa"
				legend="right"
				zoom
				zoomOverview
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
