import { useState } from 'react'
import { Flex } from '../../../components/flex'
import { Stack } from '../../../components/stack'
import { StatusDot } from '../../../components/status'
import { capitalize, Example, SizeListbox, VariantListbox } from '../../engine'

const statuses = ['inactive', 'active', 'info', 'warning', 'error'] as const

const sizes = ['xs', 'sm', 'md', 'lg'] as const

export function Demo() {
	const [status, setStatus] = useState<(typeof statuses)[number]>('active')
	const [pulseSize, setPulseSize] = useState<(typeof sizes)[number]>('md')

	return (
		<>
			<Example title="Statuses">
				<Stack gap="md">
					{statuses.map((s) => (
						<Flex key={s} gap="sm">
							<StatusDot status={s} />
							<span className="text-sm text-zinc-500 dark:text-zinc-400">{capitalize(s)}</span>
						</Flex>
					))}
				</Stack>
			</Example>

			<Example title="Outline">
				<Stack gap="md">
					{statuses.map((s) => (
						<Flex key={s} gap="sm">
							<StatusDot variant="outline" status={s} />
							<span className="text-sm text-zinc-500 dark:text-zinc-400">{capitalize(s)}</span>
						</Flex>
					))}
				</Stack>
			</Example>

			<Example
				title="Sizes"
				actions={<VariantListbox variants={statuses} value={status} onValueChange={setStatus} />}
			>
				<Stack gap="md">
					{sizes.map((size) => (
						<Flex key={size} gap="sm">
							<StatusDot status={status} size={size} />
							<span className="text-sm text-zinc-500 dark:text-zinc-400">{size}</span>
						</Flex>
					))}
				</Stack>
			</Example>

			<Example
				title="Pulse"
				actions={<SizeListbox sizes={sizes} value={pulseSize} onValueChange={setPulseSize} />}
			>
				<Flex>
					<StatusDot status="error" size={pulseSize} pulse />
				</Flex>
			</Example>
		</>
	)
}
