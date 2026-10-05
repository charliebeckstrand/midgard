import { useState } from 'react'
import { HoldButton } from 'ui/hold-button'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'

export default function HoldToConfirm() {
	const [count, setCount] = useState(0)

	return (
		<Stack gap="lg" align="start">
			<HoldButton onHoldComplete={() => setCount((value) => value + 1)}>Hold to confirm</HoldButton>
			<Text tone="muted">Confirmed {count} times</Text>
		</Stack>
	)
}
