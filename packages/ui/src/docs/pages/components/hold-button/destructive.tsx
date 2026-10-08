import { Trash } from 'lucide-react'
import { useState } from 'react'
import { Flex } from 'ui/flex'
import { HoldButton } from 'ui/hold-button'
import { Icon } from 'ui/icon'
import { Text } from 'ui/text'
import { ResetButton } from '../../../kit/reset-button.tsx'

export default function Destructive() {
	const [deleted, setDeleted] = useState(false)

	if (deleted) {
		return (
			<Flex gap="md" align="center">
				<Text tone="success">Item deleted</Text>
				<ResetButton onClick={() => setDeleted(false)} />
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
