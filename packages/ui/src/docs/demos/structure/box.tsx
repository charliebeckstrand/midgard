import { Box } from '../../../structure/box'
import { Stack } from '../../../structure/stack'
import { Example } from '../../engine'

export function Demo() {
	return (
		<>
			<Example title="Default">
				<Box>Content</Box>
			</Example>

			<Example title="With background">
				<Box p="lg" bg="tint">
					Content
				</Box>
				<Box p="lg" bg="surface">
					Content
				</Box>
			</Example>

			<Example title="With radius">
				<Box p="lg" bg="tint" radius="lg">
					Content
				</Box>
			</Example>

			<Example title="Outline">
				<Stack gap="lg">
					<Box p="lg" bg="surface" radius="lg" outline>
						Default outline
					</Box>
					<Box p="lg" bg="surface" radius="lg" outline="subtle">
						Subtle outline
					</Box>
					<Box p="lg" bg="surface" radius="lg" outline="strong">
						Strong outline
					</Box>
				</Stack>
			</Example>
		</>
	)
}
