import { Plus } from 'lucide-react'
import { Flex } from 'ui/flex'
import { Icon } from 'ui/icon'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'

const sizes = ['xs', 'sm', 'md', 'lg'] as const

export default function Sizes() {
	return (
		<Flex gap="lg" wrap>
			{sizes.map((size) => (
				<Stack key={size} gap="sm" align="center">
					<Icon icon={<Plus />} size={size} />
					<Text as="span" tone="muted" size="sm">
						{size}
					</Text>
				</Stack>
			))}
		</Flex>
	)
}
