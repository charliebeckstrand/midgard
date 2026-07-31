import { Trash } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/button'
import { Flex } from '../../../components/flex'
import { HoldButton } from '../../../components/hold-button'
import { Icon } from '../../../components/icon'
import { Text } from '../../../components/text'
import { Example, VariantListbox } from '../../engine'

const variants = ['solid', 'soft', 'outline', 'plain'] as const

type Variant = (typeof variants)[number]

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

export function Demo() {
	const [count, setCount] = useState(0)

	const [variant, setVariant] = useState<Variant>('solid')

	const [status, setStatus] = useState<'idle' | 'holding' | 'cancelled' | 'confirmed'>('idle')

	return (
		<>
			<Example
				title="Default"
				actions={<VariantListbox variants={variants} value={variant} onValueChange={setVariant} />}
			>
				<Flex direction="col" gap="lg">
					<HoldButton variant={variant} onHoldComplete={() => setCount((c) => c + 1)}>
						Hold to confirm
					</HoldButton>
					<Text severity="muted">Confirmed {count} times</Text>
				</Flex>
			</Example>

			<Example title="Destructive">
				<DestructiveHoldButtonExample />
			</Example>

			<Example title="Durations">
				<Flex wrap gap="sm">
					<HoldButton duration={500} onHoldComplete={() => {}}>
						Fast
					</HoldButton>
					<HoldButton duration={1000} onHoldComplete={() => {}}>
						Default
					</HoldButton>
					<HoldButton duration={3000} onHoldComplete={() => {}}>
						Slow
					</HoldButton>
				</Flex>
			</Example>

			<Example title="Lifecycle callbacks">
				<Flex direction="col" gap="lg">
					<HoldButton
						color="amber"
						onHoldStart={() => setStatus('holding')}
						onHoldCancel={() => setStatus('cancelled')}
						onHoldComplete={() => setStatus('confirmed')}
					>
						Hold me
					</HoldButton>
					<Text severity="muted">Status: {status}</Text>
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
