import { Badge } from '../../components/badge'
import { Button } from '../../components/button'
import { Card } from '../../components/card'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

export default function StackDemo() {
	return (
		<Stack gap="xl">
			<Example title="Column">
				<Stack gap="md">
					<Card>One</Card>
					<Card>Two</Card>
					<Card>Three</Card>
				</Stack>
			</Example>

			<Example title="Row">
				<Stack direction="row" gap="md">
					<Card>One</Card>
					<Card>Two</Card>
					<Card>Three</Card>
				</Stack>
			</Example>

			<Example title="Align and justify">
				<Card p="md" bg="none">
					<Stack direction="row" gap="md" justify="between" align="center" full>
						<Card>Start</Card>
						<Card>Middle</Card>
						<Card>End</Card>
					</Stack>
				</Card>
			</Example>

			<Example title="Wrap">
				<Stack direction="row" gap="sm" wrap>
					<Badge>design</Badge>
					<Badge>engineering</Badge>
					<Badge>product</Badge>
					<Badge>research</Badge>
					<Badge>operations</Badge>
					<Badge>marketing</Badge>
					<Badge>support</Badge>
				</Stack>
			</Example>

			<Example title="Composed with buttons">
				<Stack direction="row" gap="md" justify="end">
					<Button variant="plain">Cancel</Button>
					<Button>Save changes</Button>
				</Stack>
			</Example>
		</Stack>
	)
}
