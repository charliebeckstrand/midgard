import { Trash } from 'lucide-react'
import { useState } from 'react'
import { Button } from 'ui/button'
import { Flex } from 'ui/flex'
import { HoldButton } from 'ui/hold-button'
import { Icon } from 'ui/icon'
import { Text } from 'ui/text'

export default function Destructive() {
	const [deleted, setDeleted] = useState(false)

	if (deleted) {
		return (
			<Flex gap="md" align="center">
				<Text tone="success">Item deleted</Text>
				<Button variant="soft" color="red" onClick={() => setDeleted(false)}>
					Reset
				</Button>
			</Flex>
		)
	}

	return (
		<HoldButton color="red" onHoldComplete={() => setDeleted(true)}>
			<Icon icon={<Trash />} />
			Hold to delete
		</HoldButton>
	)
}
