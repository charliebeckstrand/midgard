import { useState } from 'react'
import { Button } from '../../../../components/button'
import { Flex } from '../../../../components/flex'
import { LoadingSpinner } from '../../../../components/loading'
import { Stack } from '../../../../components/stack'
import { capitalize, Example, LabeledColumn, SizeListbox } from '../../../engine'
import { type ButtonSize, buttonSizes, colors, sizes } from './_data'

export function Demo() {
	const [buttonSize, setButtonSize] = useState<ButtonSize>('md')

	return (
		<Stack gap="xl">
			<Example title="Default">
				<LoadingSpinner />
			</Example>

			<Example title="Sizes">
				<Flex gap="lg" align="end">
					{sizes.map((s) => (
						<LabeledColumn key={s} label={s}>
							<LoadingSpinner size={s} />
						</LabeledColumn>
					))}
				</Flex>
			</Example>

			<Example title="Colors">
				<Flex gap="lg">
					{colors.map((c) => (
						<LabeledColumn key={c} label={capitalize(c)}>
							<LoadingSpinner color={c} size="lg" />
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
					<Button disabled size={buttonSize} prefix={<LoadingSpinner />}>
						Loading
					</Button>
					<Button variant="soft" disabled size={buttonSize} prefix={<LoadingSpinner />}>
						Saving
					</Button>
				</Flex>
			</Example>
		</Stack>
	)
}
