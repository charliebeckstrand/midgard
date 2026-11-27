import { useState } from 'react'
import { Button } from 'ui/button'
import { recordEvent } from 'ui/events'
import { Flex } from 'ui/flex'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'

export default function RecordAnEvent() {
	const [saves, setSaves] = useState(0)

	// The app writes its own events, such as the end of a save. A call while the
	// events do not run does nothing.
	return (
		<Stack gap="md">
			<Text tone="muted">Turn on Debug in the settings, then open the Events sheet.</Text>
			<Flex align="center" gap="md">
				<Button
					onClick={() => {
						setSaves((prev) => prev + 1)

						recordEvent('save', 'save ends', { saves: saves + 1 })
					}}
				>
					Save
				</Button>
				<Text>Saves: {saves}</Text>
			</Flex>
		</Stack>
	)
}
