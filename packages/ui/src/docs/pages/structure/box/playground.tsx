import { Box, type BoxProps } from 'ui/box'
import { Button } from 'ui/button'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'

export default function BoxPlayground(props: BoxProps) {
	return (
		<Box p="lg" {...props}>
			<Stack gap="sm" align="start">
				<Text>Box content</Text>
				<Button>Action</Button>
			</Stack>
		</Box>
	)
}
