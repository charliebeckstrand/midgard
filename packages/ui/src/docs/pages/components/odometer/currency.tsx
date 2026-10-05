import { useState } from 'react'
import { Button } from 'ui/button'
import { Heading } from 'ui/heading'
import { Odometer } from 'ui/odometer'
import { useFormat } from 'ui/providers/locale'
import { Stack } from 'ui/stack'

export default function Currency() {
	const [value, setValue] = useState(48_215.67)

	const format = useFormat({ type: 'currency' })

	return (
		<Stack gap="md" align="start">
			<Heading level={2}>
				<Odometer value={value} format={format} />
			</Heading>
			<Button onClick={() => setValue(Math.random() * 100_000)}>Randomize</Button>
		</Stack>
	)
}
