import { Box } from '../../components/box'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

export default function BoxDemo() {
	return (
		<Stack gap={6}>
			<Example title="Default">
				<Box>Content</Box>
			</Example>

			<Example title="With background">
				<Box p={4} bg="tint">
					Content
				</Box>
				<Box p={4} bg="surface">
					Content
				</Box>
			</Example>

			<Example title="With radius">
				<Box p={4} bg="tint" radius="lg">
					Content
				</Box>
			</Example>

			<Example title="Outline">
				<Stack gap={4}>
					<Box p={4} bg="surface" radius="lg" outline>
						Default outline
					</Box>
					<Box p={4} bg="surface" radius="lg" outline="subtle">
						Subtle outline
					</Box>
					<Box p={4} bg="surface" radius="lg" outline="strong">
						Strong outline
					</Box>
				</Stack>
			</Example>
		</Stack>
	)
}
