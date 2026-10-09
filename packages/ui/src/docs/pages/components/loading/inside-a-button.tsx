import { Button } from 'ui/button'
import { Flex } from 'ui/flex'
import { LoadingDots } from 'ui/loading'
import { Stack } from 'ui/stack'

const sizes = ['xs', 'sm', 'md', 'lg'] as const

export default function InsideAButton() {
	return (
		<Stack gap="md">
			{sizes.map((size) => (
				<Flex key={size} gap="md" align="center">
					<Button size={size} loading>
						Loading
					</Button>
					<Button size={size} variant="soft" disabled aria-busy prefix={<LoadingDots />}>
						Saving
					</Button>
				</Flex>
			))}
		</Stack>
	)
}
