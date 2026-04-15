import { useState } from 'react'
import { Flex } from '../../components/flex'
import { Stack } from '../../components/stack'
import { StatusDot } from '../../components/status'
import { Example } from '../components/example'
import { SizeListbox } from '../components/size-listbox'
import { VariantListbox } from '../components/variant-listbox'

export const meta = { category: 'Data Display' }

const statuses = ['inactive', 'active', 'info', 'warning', 'error'] as const

const sizes = ['xs', 'sm', 'md', 'lg'] as const

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default function StatusDemo() {
	const [status, setStatus] = useState<(typeof statuses)[number]>('active')
	const [pulseSize, setPulseSize] = useState<(typeof sizes)[number]>('md')

	return (
		<Stack gap={8}>
			<Example title="Statuses">
				<Stack gap={3}>
					{statuses.map((s) => (
						<Flex key={s} gap={2}>
							<StatusDot status={s} />
							<span className="text-sm text-zinc-500 dark:text-zinc-400">{cap(s)}</span>
						</Flex>
					))}
				</Stack>
			</Example>

			<Example title="Outline">
				<Stack gap={3}>
					{statuses.map((s) => (
						<Flex key={s} gap={2}>
							<StatusDot variant="outline" status={s} />
							<span className="text-sm text-zinc-500 dark:text-zinc-400">{cap(s)}</span>
						</Flex>
					))}
				</Stack>
			</Example>

			<Example
				title="Sizes"
				actions={<VariantListbox variants={statuses} value={status} onChange={setStatus} />}
			>
				<Stack gap={3}>
					{sizes.map((size) => (
						<Flex key={size} gap={2}>
							<StatusDot status={status} size={size} />
							<span className="text-sm text-zinc-500 dark:text-zinc-400">{size}</span>
						</Flex>
					))}
				</Stack>
			</Example>

			<Example
				title="Pulse"
				actions={<SizeListbox sizes={sizes} value={pulseSize} onChange={setPulseSize} />}
			>
				<Flex>
					<StatusDot status="error" size={pulseSize} pulse />
				</Flex>
			</Example>
		</Stack>
	)
}
