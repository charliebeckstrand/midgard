import { useState } from 'react'
import { Button } from 'ui/button'
import { Odometer } from 'ui/odometer'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'

export default function Instant() {
	const [value, setValue] = useState(1284)

	return (
		<Stack gap="md" align="start">
			<Text size="lg">
				<Odometer value={value} duration={0} />
			</Text>
			<Button onClick={() => setValue(Math.floor(Math.random() * 100_000))}>Randomize</Button>
		</Stack>
	)
}
