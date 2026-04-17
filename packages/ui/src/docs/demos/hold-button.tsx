'use client'

import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Flex } from '../../components/flex'
import { HoldButton } from '../../components/hold-button'
import { Icon } from '../../components/icon'
import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

export default function HoldButtonDemo() {
	const [count, setCount] = useState(0)
	const [status, setStatus] = useState<'idle' | 'holding' | 'cancelled' | 'confirmed'>('idle')

	return (
		<Stack gap={6}>
			<Example title="Default">
				<Flex align="center" gap={3}>
					<HoldButton onComplete={() => setCount((c) => c + 1)}>Hold to confirm</HoldButton>
					<Text color="muted">Confirmed {count} times</Text>
				</Flex>
			</Example>

			<Example title="Destructive">
				<HoldButton
					color="red"
					duration={2000}
					onComplete={() => alert('Deleted')}
					aria-label="Hold to delete"
				>
					<Icon icon={<Trash2 />} />
					Hold to delete
				</HoldButton>
			</Example>

			<Example title="Durations">
				<Flex wrap gap={2}>
					<HoldButton duration={500} onComplete={() => {}}>
						Fast (0.5s)
					</HoldButton>
					<HoldButton duration={1500} onComplete={() => {}}>
						Default (1.5s)
					</HoldButton>
					<HoldButton duration={3000} onComplete={() => {}}>
						Slow (3s)
					</HoldButton>
				</Flex>
			</Example>

			<Example title="Variants">
				<Flex wrap gap={2}>
					<HoldButton variant="solid" color="red" onComplete={() => {}}>
						Solid
					</HoldButton>
					<HoldButton variant="soft" color="red" onComplete={() => {}}>
						Soft
					</HoldButton>
					<HoldButton variant="outline" color="red" onComplete={() => {}}>
						Outline
					</HoldButton>
				</Flex>
			</Example>

			<Example title="Lifecycle callbacks">
				<Flex align="center" gap={3}>
					<HoldButton
						color="amber"
						onHoldStart={() => setStatus('holding')}
						onHoldCancel={() => setStatus('cancelled')}
						onComplete={() => setStatus('confirmed')}
					>
						Hold me
					</HoldButton>
					<Text color="muted">Status: {status}</Text>
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
