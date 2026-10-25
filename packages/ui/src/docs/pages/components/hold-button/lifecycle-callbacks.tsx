import { useState } from 'react'
import { HoldButton } from 'ui/hold-button'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { words } from '../../../data/words.ts'

const holdEvents = words('hold-event', {
	start: 'Hold start',
	cancel: 'Hold cancel',
	complete: 'Hold complete',
})

export default function LifecycleCallbacks() {
	const [event, setEvent] = useState<keyof typeof holdEvents>()

	return (
		<Stack gap="lg" align="start">
			<HoldButton
				color="amber"
				onHoldStart={() => setEvent('start')}
				onHoldCancel={() => setEvent('cancel')}
				onHoldComplete={() => setEvent('complete')}
			>
				Hold to send
			</HoldButton>
			<Text tone="muted">Last event: {event ? holdEvents[event] : 'None'}</Text>
		</Stack>
	)
}
