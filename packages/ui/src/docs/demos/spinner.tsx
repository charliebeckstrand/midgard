import { useState } from 'react'
import { Button } from '../../components/button'
import { Flex } from '../../components/flex'
import { Spinner } from '../../components/spinner'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'
import { SizeListbox } from '../components/size-listbox'
import { sizes as buttonSizes } from '../demos/button'

export const meta = { category: 'Feedback' }

const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const

type ButtonSize = (typeof buttonSizes)[number]

const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default function SpinnerDemo() {
	const [buttonSize, setButtonSize] = useState<ButtonSize>('md')

	return (
		<Stack gap={6}>
			<Example title="Default">
				<Spinner />
			</Example>

			<Example title="Sizes">
				<div className="flex items-end gap-4">
					{sizes.map((s) => (
						<Stack key={s} gap={2} align="center">
							<Spinner size={s} />
							<span className="text-xs text-zinc-500">{s}</span>
						</Stack>
					))}
				</div>
			</Example>

			<Example title="Colors">
				<Flex gap={4}>
					{colors.map((c) => (
						<Stack key={c} gap={2} align="center">
							<Spinner color={c} size="lg" />
							<span className="text-xs text-zinc-500">{cap(c)}</span>
						</Stack>
					))}
				</Flex>
			</Example>

			<Example
				title="Inside a button"
				actions={<SizeListbox sizes={buttonSizes} value={buttonSize} onChange={setButtonSize} />}
			>
				<Flex gap={3}>
					<Button disabled size={buttonSize} prefix={<Spinner />}>
						Loading
					</Button>
					<Button variant="soft" disabled size={buttonSize} prefix={<Spinner />}>
						Saving
					</Button>
				</Flex>
			</Example>
		</Stack>
	)
}
