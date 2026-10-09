import { useState } from 'react'
import { Button } from 'ui/button'
import { Odometer, type OdometerProps } from 'ui/odometer'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'

export default function OdometerPlayground(props: OdometerProps) {
	const [value, setValue] = useState(1284)

	return (
		<Stack gap="md" align="start">
			<Text size="lg">
				<Odometer {...props} value={value} />
			</Text>
			<Button onClick={() => setValue(Math.floor(Math.random() * 100_000))}>Randomize</Button>
		</Stack>
	)
}
