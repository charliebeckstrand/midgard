import { useState } from 'react'
import { Button } from 'ui/button'
import { Heading } from 'ui/heading'
import { Odometer } from 'ui/odometer'
import { Stack } from 'ui/stack'

export default function Instant() {
	const [value, setValue] = useState(1284)

	return (
		<Stack gap="md" align="start">
			<Heading level={2}>
				<Odometer value={value} duration={0} />
			</Heading>
			<Button onClick={() => setValue(Math.floor(Math.random() * 100_000))}>Randomize</Button>
		</Stack>
	)
}
