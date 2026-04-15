import { Box } from '../../components/box'
import { Stack } from '../../components/stack'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

export default function BoxDemo() {
	return (
		<Stack gap={8}>
			<Example title="Default">
				<Box>Content</Box>
			</Example>

			<Example title="Background">
				<Box p={4} bg="tint">
					Content
				</Box>
				<Box p={4} bg="surface">
					Content
				</Box>
			</Example>

			<Example title="Radius">
				<Box p={4} bg="tint" radius="lg">
					Content
				</Box>
			</Example>

			<Example
				title="Bordered"
				code={code`
					import { Box } from 'ui/box'

					<Box p={4} bg="surface" radius="lg" border>
						Surface with default border
					</Box>
					<Box p={4} bg="surface" radius="lg" border="subtle">
						Subtle border
					</Box>
				`}
			>
				<Stack gap={4}>
					<Box p={4} bg="surface" radius="lg" border>
						Surface with default border
					</Box>
					<Box p={4} bg="surface" radius="lg" border="subtle">
						Subtle border
					</Box>
				</Stack>
			</Example>
		</Stack>
	)
}
