import { useState } from 'react'
import { Button } from 'ui/button'
import { Odometer } from 'ui/odometer'
import { useFormat } from 'ui/providers/locale'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'

export default function Currency() {
	const [value, setValue] = useState(48_215.67)

	const format = useFormat({ type: 'currency' })

	return (
		<Stack gap="md" align="start">
			<Text size="lg">
				<Odometer value={value} format={format} />
			</Text>
			<Button onClick={() => setValue(Math.random() * 100_000)}>Randomize</Button>
		</Stack>
	)
}
