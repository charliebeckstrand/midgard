'use client'

import { useState } from 'react'
import { Button } from '../../components/button'
import { Flex } from '../../components/flex'
import { Spinner } from '../../components/spinner'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'
import { capitalize } from '../components/format'
import { LabeledColumn } from '../components/labeled'
import { SizeListbox } from '../components/size-listbox'
import { sizes as buttonSizes } from '../demos/button'

export const meta = { category: 'Feedback' }

const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const

type ButtonSize = (typeof buttonSizes)[number]

const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

export default function SpinnerDemo() {
	const [buttonSize, setButtonSize] = useState<ButtonSize>('md')

	return (
		<Stack gap="xl">
			<Example title="Default">
				<Spinner />
			</Example>

			<Example title="Sizes">
				<Flex gap="lg" align="end">
					{sizes.map((s) => (
						<LabeledColumn key={s} label={s}>
							<Spinner size={s} />
						</LabeledColumn>
					))}
				</Flex>
			</Example>

			<Example title="Colors">
				<Flex gap="lg">
					{colors.map((c) => (
						<LabeledColumn key={c} label={capitalize(c)}>
							<Spinner color={c} size="lg" />
						</LabeledColumn>
					))}
				</Flex>
			</Example>

			<Example
				title="Inside a button"
				actions={
					<SizeListbox sizes={buttonSizes} value={buttonSize} onValueChange={setButtonSize} />
				}
			>
				<Flex gap="md">
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
