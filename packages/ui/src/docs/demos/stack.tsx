import { Area } from '../components/area'
import { Badge } from '../../components/badge'
import { Button } from '../../components/button'
import { Card } from '../../components/card'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

export default function StackDemo() {
	return (
		<Stack gap={8}>
			<Example title="Column (default)">
				<Stack gap={3}>
					<Card>One</Card>
					<Card>Two</Card>
					<Card>Three</Card>
				</Stack>
			</Example>

			<Example title="Row">
				<Stack direction="row" gap={3}>
					<Card>One</Card>
					<Card>Two</Card>
					<Card>Three</Card>
				</Stack>
			</Example>

			<Example title="Align and justify">
				<Area p={3} className="h-24 w-full">
					<Stack direction="row" gap={3} justify="between" align="center" full>
						<Card>Start</Card>
						<Card>Middle</Card>
						<Card>End</Card>
					</Stack>
				</Area>
			</Example>

			<Example title="Wrap">
				<Stack direction="row" gap={2} wrap>
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
				<Stack direction="row" gap={3} justify="end">
					<Button variant="plain">Cancel</Button>
					<Button>Save changes</Button>
				</Stack>
			</Example>
		</Stack>
	)
}
