import { useState } from 'react'
import { HoldButton } from 'ui/hold-button'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'

type HoldEvent = 'Hold start' | 'Hold cancel' | 'Hold complete'

export default function LifecycleCallbacks() {
	const [event, setEvent] = useState<HoldEvent>()

	return (
		<Stack gap="lg" align="start">
			<HoldButton
				color="amber"
				onHoldStart={() => setEvent('Hold start')}
				onHoldCancel={() => setEvent('Hold cancel')}
				onHoldComplete={() => setEvent('Hold complete')}
			>
				Hold to send
			</HoldButton>
			<Text tone="muted">Last event: {event ?? 'None'}</Text>
		</Stack>
	)
}
