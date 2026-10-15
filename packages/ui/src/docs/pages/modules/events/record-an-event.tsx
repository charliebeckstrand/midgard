import { useState } from 'react'
import { Button } from 'ui/button'
import { recordEvent } from 'ui/events'
import { Flex } from 'ui/flex'
import { Text } from 'ui/text'

export default function RecordAnEvent() {
	const [saves, setSaves] = useState(0)

	// The app writes its own events, such as the end of a save. A call while the
	// events do not run does nothing.
	return (
		<Flex align="center" gap="md">
			<Button
				onClick={() => {
					setSaves((prev) => prev + 1)

					recordEvent('save', 'save ends', { saves: saves + 1 })
				}}
			>
				Save
			</Button>
			<Text tone="muted">Saves: {saves}</Text>
		</Flex>
	)
}
