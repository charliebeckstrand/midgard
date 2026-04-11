import { Area } from '../../components/area'
import { Badge } from '../../components/badge'
import { Button } from '../../components/button'
import { Card } from '../../components/card'
import { Stack } from '../../components/stack'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

export default function StackDemo() {
	return (
		<div className="space-y-8">
			<Example
				title="Column (default)"
				code={code`
					import { Stack } from 'ui/stack'

					<Stack gap={3}>
						<Card>One</Card>
						<Card>Two</Card>
						<Card>Three</Card>
					</Stack>
				`}
			>
				<Stack gap={3}>
					<Card>One</Card>
					<Card>Two</Card>
					<Card>Three</Card>
				</Stack>
			</Example>

			<Example
				title="Row"
				code={code`
					import { Stack } from 'ui/stack'

					<Stack direction="row" gap={3}>
						<Card>One</Card>
						<Card>Two</Card>
						<Card>Three</Card>
					</Stack>
				`}
			>
				<Stack direction="row" gap={3}>
					<Card>One</Card>
					<Card>Two</Card>
					<Card>Three</Card>
				</Stack>
			</Example>

			<Example
				title="Align and justify"
				code={code`
					import { Stack } from 'ui/stack'

					<Stack direction="row" gap={3} justify="between" align="center" className="h-24">
						<Card>Start</Card>
						<Card>Middle</Card>
						<Card>End</Card>
					</Stack>
				`}
			>
				<Area padding="md" className="h-24 w-full">
					<Stack direction="row" gap={3} justify="between" align="center" className="h-full">
						<Card>Start</Card>
						<Card>Middle</Card>
						<Card>End</Card>
					</Stack>
				</Area>
			</Example>

			<Example
				title="Wrap"
				code={code`
					import { Stack } from 'ui/stack'
					import { Badge } from 'ui/badge'

					<Stack direction="row" gap={2} wrap>
						<Badge>design</Badge>
						<Badge>engineering</Badge>
						<Badge>product</Badge>
						{/* … */}
					</Stack>
				`}
			>
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

			<Example
				title="Composed with buttons"
				code={code`
					import { Stack } from 'ui/stack'
					import { Button } from 'ui/button'

					<Stack direction="row" gap={3} justify="end">
						<Button variant="plain">Cancel</Button>
						<Button>Save changes</Button>
					</Stack>
				`}
			>
				<Stack direction="row" gap={3} justify="end">
					<Button variant="plain">Cancel</Button>
					<Button>Save changes</Button>
				</Stack>
			</Example>
		</div>
	)
}
