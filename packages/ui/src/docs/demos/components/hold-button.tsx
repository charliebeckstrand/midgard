import { Trash } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/button'
import { HoldButton } from '../../../components/hold-button'
import { Icon } from '../../../components/icon'
import { Text } from '../../../components/text'
import { Flex } from '../../../structure/flex'
import { Axes, Example } from '../../engine'

function DestructiveHoldButtonExample() {
	const [deleted, setDeleted] = useState(false)

	return deleted ? (
		<>
			<Text color="green">Item deleted!</Text>

			<Button variant="soft" color="red" onClick={() => setDeleted(false)}>
				Reset
			</Button>
		</>
	) : (
		<HoldButton color="red" onHoldComplete={() => setDeleted(true)} aria-label="Hold to delete">
			<Icon icon={<Trash />} />
			Hold to delete
		</HoldButton>
	)
}

export default function Demo() {
	const [count, setCount] = useState(0)

	const [status, setStatus] = useState<'idle' | 'holding' | 'canceled' | 'confirmed'>('idle')

	return (
		<>
			<Axes
				of="HoldButton"
				captions={false}
				render={(props, label) => <HoldButton {...props}>{label}</HoldButton>}
			/>

			<Example title="Hold to confirm">
				<Flex direction="col" gap="lg">
					<HoldButton onHoldComplete={() => setCount((c) => c + 1)}>Hold to confirm</HoldButton>
					<Text tone="muted">Confirmed {count} times</Text>
				</Flex>
			</Example>

			<Example title="Destructive">
				<DestructiveHoldButtonExample />
			</Example>

			<Example title="Durations">
				<HoldButton duration={500} onHoldComplete={() => {}}>
					Fast
				</HoldButton>
				<HoldButton duration={1000} onHoldComplete={() => {}}>
					Default
				</HoldButton>
				<HoldButton duration={3000} onHoldComplete={() => {}}>
					Slow
				</HoldButton>
			</Example>

			<Example title="Lifecycle callbacks">
				<Flex direction="col" gap="lg">
					<HoldButton
						color="amber"
						onHoldStart={() => setStatus('holding')}
						onHoldCancel={() => setStatus('canceled')}
						onHoldComplete={() => setStatus('confirmed')}
					>
						Hold me
					</HoldButton>
					<Text tone="muted">Status: {status}</Text>
				</Flex>
			</Example>

			<Example title="Disabled">
				<HoldButton disabled onHoldComplete={() => {}}>
					Cannot hold
				</HoldButton>
			</Example>
		</>
	)
}
