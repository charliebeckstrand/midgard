import { useState } from 'react'
import { HoldButton } from 'ui/hold-button'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'

type Status = 'idle' | 'holding' | 'canceled' | 'confirmed'

export default function LifecycleCallbacks() {
	const [status, setStatus] = useState<Status>('idle')

	return (
		<Stack gap="lg" align="start">
			<HoldButton
				color="amber"
				onHoldStart={() => setStatus('holding')}
				onHoldCancel={() => setStatus('canceled')}
				onHoldComplete={() => setStatus('confirmed')}
			>
				Hold me
			</HoldButton>
			<Text tone="muted">Status: {status}</Text>
		</Stack>
	)
}
