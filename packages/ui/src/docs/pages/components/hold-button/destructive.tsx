import { Trash } from 'lucide-react'
import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Flex } from 'ui/flex'
import { HoldButton } from 'ui/hold-button'
import { Icon } from 'ui/icon'
import { Text } from 'ui/text'
import { ResetButton } from '../../../kit/reset-button.tsx'

export default function Destructive() {
	const [deleted, setDeleted] = useState(false)

	const holdRef = useRef<HTMLButtonElement>(null)

	const resetRef = useRef<HTMLButtonElement>(null)

	// Each button leaves when it is used, so it gives the focus to the button that
	// replaces it.
	const remove = () => {
		flushSync(() => setDeleted(true))

		resetRef.current?.focus()
	}

	const reset = () => {
		flushSync(() => setDeleted(false))

		holdRef.current?.focus()
	}

	if (deleted) {
		return (
			<Flex gap="md" align="center">
				<Text tone="success">Item deleted</Text>
				<ResetButton ref={resetRef} onClick={reset} />
			</Flex>
		)
	}

	return (
		<HoldButton ref={holdRef} color="red" onHoldComplete={remove}>
			<Icon icon={<Trash />} />
			Hold to delete
		</HoldButton>
	)
}
