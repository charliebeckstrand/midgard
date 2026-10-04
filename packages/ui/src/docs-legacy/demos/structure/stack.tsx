import { Badge } from '../../../components/badge'
import { Button } from '../../../components/button'
import { Card } from '../../../components/card'
import { Flex } from '../../../structure/flex'
import { Stack } from '../../../structure/stack'
import { Axes, Example } from '../../engine'

// The frame fixes a width and a height. The items fill less than the frame, so
// the `flex` and `full` axes show the Stack grow to the frame. The dashed border
// shows the bounds of the Stack. The Wrap example below needs items that overflow,
// so `wrap` is not an axis here.
const FRAME =
	'flex h-44 w-64 overflow-hidden rounded-lg border border-zinc-950/10 p-2 dark:border-white/10'

const BOUNDS = 'rounded-md border border-dashed border-zinc-400 p-1 dark:border-zinc-600'

const ITEM = 'flex h-7 items-center rounded-md bg-zinc-950/5 px-2 text-sm dark:bg-white/10'

const ITEMS = ['One', 'Two', 'Three']

export default function Demo() {
	return (
		<>
			<Axes
				of="Stack"
				omit={['as', 'wrap']}
				render={(props) => (
					<div className={FRAME}>
						<Stack gap="sm" className={BOUNDS} {...props}>
							{ITEMS.map((item) => (
								<div key={item} className={ITEM}>
									{item}
								</div>
							))}
						</Stack>
					</div>
				)}
			/>

			<Example title="Wrap">
				<div className="h-32">
					<Stack gap="sm" wrap className="h-full">
						<Badge>design</Badge>
						<Badge>engineering</Badge>
						<Badge>product</Badge>
						<Badge>research</Badge>
						<Badge>operations</Badge>
						<Badge>marketing</Badge>
						<Badge>support</Badge>
					</Stack>
				</div>
			</Example>

			<Example title="Column">
				<Stack gap="md">
					<Card>One</Card>
					<Card>Two</Card>
					<Card>Three</Card>
				</Stack>
			</Example>

			<Example title="Row">
				<Flex gap="md">
					<Card>One</Card>
					<Card>Two</Card>
					<Card>Three</Card>
				</Flex>
			</Example>

			<Example title="Align and justify">
				<Card bg="none">
					<Flex gap="md" justify="between" align="center">
						<Card>Start</Card>
						<Card>Middle</Card>
						<Card>End</Card>
					</Flex>
				</Card>
			</Example>

			<Example title="Composed with buttons">
				<Flex gap="md" justify="end">
					<Button variant="plain">Cancel</Button>
					<Button>Save changes</Button>
				</Flex>
			</Example>
		</>
	)
}
