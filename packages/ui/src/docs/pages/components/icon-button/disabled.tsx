import { Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { Flex } from 'ui/flex'
import { IconButton } from 'ui/icon-button'
import { Text } from 'ui/text'

export default function Disabled() {
	const [count, setCount] = useState(1)

	return (
		<Flex gap="sm" align="center">
			<IconButton
				icon={<Minus />}
				aria-label="Decrease"
				disabled={count === 0}
				onClick={() => setCount(count - 1)}
			/>
			<Text>{count}</Text>
			<IconButton
				icon={<Plus />}
				aria-label="Increase"
				disabled={count === 3}
				onClick={() => setCount(count + 1)}
			/>
		</Flex>
	)
}
