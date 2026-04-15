import { Badge } from '../../components/badge'
import { Button } from '../../components/button'
import { Card } from '../../components/card'
import { Flex } from '../../components/flex'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

export default function FlexDemo() {
	return (
		<Stack gap={8}>
			<Example title="Default (row)">
				<Flex gap={3}>
					<Card>One</Card>
					<Card>Two</Card>
					<Card>Three</Card>
				</Flex>
			</Example>

			<Example title="Column">
				<Flex direction="col" gap={3}>
					<Card>One</Card>
					<Card>Two</Card>
					<Card>Three</Card>
				</Flex>
			</Example>

			<Example title="Align and justify">
				<Card p={3} bg="none">
					<Flex gap={3} justify="between" align="center" full>
						<Card>Start</Card>
						<Card>Middle</Card>
						<Card>End</Card>
					</Flex>
				</Card>
			</Example>

			<Example title="Wrap">
				<Flex gap={2} wrap>
					<Badge>design</Badge>
					<Badge>engineering</Badge>
					<Badge>product</Badge>
					<Badge>research</Badge>
					<Badge>operations</Badge>
					<Badge>marketing</Badge>
					<Badge>support</Badge>
				</Flex>
			</Example>

			<Example title="Equal">
				<Flex gap={3} equal>
					<Card>Narrow</Card>
					<Card>Wider content here</Card>
					<Card>Even wider content in this card</Card>
				</Flex>
			</Example>

			<Example title="Responsive direction">
				<Flex direction={{ initial: 'col', md: 'row' }} gap={3}>
					<Card>One</Card>
					<Card>Two</Card>
					<Card>Three</Card>
				</Flex>
			</Example>

			<Example title="Composed with buttons">
				<Flex gap={3} justify="end">
					<Button variant="plain">Cancel</Button>
					<Button>Save changes</Button>
				</Flex>
			</Example>
		</Stack>
	)
}
