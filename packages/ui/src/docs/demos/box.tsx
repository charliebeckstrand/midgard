import { Box } from '../../components/box'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

export default function BoxDemo() {
	return (
		<div className="space-y-8">
			<Example
				title="Padding and radius"
				code={code`
					import { Box } from 'ui/box'

					<Box p={4} radius="lg" bg="tint">
						Content
					</Box>
				`}
			>
				<Box p={4} radius="lg" bg="tint">
					Content
				</Box>
			</Example>

			<Example
				title="Bordered surface"
				code={code`
					import { Box } from 'ui/box'

					<Box p={6} radius="lg" bg="surface" border>
						Surface with default border
					</Box>
					<Box p={6} radius="lg" bg="surface" border="subtle">
						Subtle border
					</Box>
				`}
			>
				<div className="space-y-4">
					<Box p={6} radius="lg" bg="surface" border>
						Surface with default border
					</Box>
					<Box p={6} radius="lg" bg="surface" border="subtle">
						Subtle border
					</Box>
				</div>
			</Example>

			<Example
				title="Asymmetric spacing"
				code={code`
					import { Box } from 'ui/box'

					<Box px={6} py={3} radius="md" bg="tint">
						px=6 py=3
					</Box>
				`}
			>
				<Box px={6} py={3} radius="md" bg="tint">
					px=6 py=3
				</Box>
			</Example>
		</div>
	)
}
