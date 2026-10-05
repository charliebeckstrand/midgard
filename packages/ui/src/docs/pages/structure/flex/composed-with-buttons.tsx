import { Button } from 'ui/button'
import { Flex } from 'ui/flex'

export default function ComposedWithButtons() {
	return (
		<Flex gap="md" justify="end">
			<Button variant="plain">Cancel</Button>
			<Button>Save changes</Button>
		</Flex>
	)
}
