import { Button } from 'ui/button'
import { Flex } from 'ui/flex'
import { LoadingDots, LoadingSpinner } from 'ui/loading'
import { Stack } from 'ui/stack'

const sizes = ['xs', 'sm', 'md', 'lg'] as const

export default function InsideAButton() {
	return (
		<Stack gap="md">
			{sizes.map((size) => (
				<Flex key={size} gap="md" align="center">
					<Button size={size} disabled prefix={<LoadingSpinner />}>
						Loading
					</Button>
					<Button size={size} variant="soft" disabled prefix={<LoadingDots />}>
						Saving
					</Button>
				</Flex>
			))}
		</Stack>
	)
}
