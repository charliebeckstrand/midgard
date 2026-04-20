'use client'

import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/button'
import { Flex } from '../../components/flex'
import { HoldButton } from '../../components/hold-button'
import { Icon } from '../../components/icon'
import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { Example } from '../components/example'
import { VariantListbox } from '../components/variant-listbox'

export const meta = { category: 'Button' }

const variants = ['solid', 'soft', 'outline', 'plain', 'ghost'] as const

type Variant = (typeof variants)[number]

function DestructiveHoldButton() {
	const [deleted, setDeleted] = useState(false)

	return deleted ? (
		<>
			<Text color="green">Item deleted!</Text>

			<Button variant="soft" color="red" onClick={() => setDeleted(false)}>
				Reset
			</Button>
		</>
	) : (
		<HoldButton
			color="red"
			duration={2000}
			onComplete={() => setDeleted(true)}
			aria-label="Hold to delete"
		>
			<Icon icon={<Trash2 />} />
			Hold to delete
		</HoldButton>
	)
}

export default function HoldButtonDemo() {
	const [count, setCount] = useState(0)

	const [variant, setVariant] = useState<Variant>('solid')

	const [status, setStatus] = useState<'idle' | 'holding' | 'cancelled' | 'confirmed'>('idle')

	return (
		<Stack gap={6}>
			<Example
				title="Default"
				actions={<VariantListbox variants={variants} value={variant} onChange={setVariant} />}
			>
				<Flex direction="col" gap={4}>
					<HoldButton variant={variant} onComplete={() => setCount((c) => c + 1)}>
						Hold to confirm
					</HoldButton>
					<Text variant="muted">Confirmed {count} times</Text>
				</Flex>
			</Example>

			<Example title="Destructive">
				<DestructiveHoldButton />
			</Example>

			<Example title="Durations">
				<Flex wrap gap={2}>
					<HoldButton duration={500} onComplete={() => {}}>
						Fast
					</HoldButton>
					<HoldButton duration={1500} onComplete={() => {}}>
						Default
					</HoldButton>
					<HoldButton duration={3000} onComplete={() => {}}>
						Slow
					</HoldButton>
				</Flex>
			</Example>

			<Example title="Lifecycle callbacks">
				<Flex direction="col" gap={4}>
					<HoldButton
						color="amber"
						onHoldStart={() => setStatus('holding')}
						onHoldCancel={() => setStatus('cancelled')}
						onComplete={() => setStatus('confirmed')}
					>
						Hold me
					</HoldButton>
					<Text variant="muted">Status: {status}</Text>
				</Flex>
			</Example>

			<Example title="Disabled">
				<HoldButton disabled onComplete={() => {}}>
					Cannot hold
				</HoldButton>
			</Example>
		</Stack>
	)
}
