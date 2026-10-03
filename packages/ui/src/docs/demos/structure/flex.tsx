import { Badge } from '../../../components/badge'
import { Button } from '../../../components/button'
import { Card } from '../../../components/card'
import { Flex } from '../../../structure/flex'
import { Axes, Example } from '../../engine'

// The frame fixes a width and a height. The items fill less than the frame, so
// the `flex` and `full` axes show the Flex grow to the frame. The dashed border
// shows the bounds of the Flex. The Wrap example below needs items that overflow,
// so `wrap` is not an axis here.
const FRAME =
	'flex h-20 w-64 overflow-hidden rounded-lg border border-zinc-950/10 p-2 dark:border-white/10'

const BOUNDS = 'rounded-md border border-dashed border-zinc-400 p-1 dark:border-zinc-600'

const ITEM = 'flex h-7 items-center rounded-md bg-zinc-950/5 px-2 text-sm dark:bg-white/10'

const ITEMS = ['One', 'Two', 'Three']

export function Demo() {
	return (
		<>
			<Axes
				of="Flex"
				omit={['as', 'wrap']}
				render={(props) => (
					<div className={FRAME}>
						<Flex gap="sm" className={BOUNDS} {...props}>
							{ITEMS.map((item) => (
								<div key={item} className={ITEM}>
									{item}
								</div>
							))}
						</Flex>
					</div>
				)}
			/>

			<Example title="Wrap">
				<div className="w-64">
					<Flex gap="sm" wrap>
						<Badge>design</Badge>
						<Badge>engineering</Badge>
						<Badge>product</Badge>
						<Badge>research</Badge>
						<Badge>operations</Badge>
						<Badge>marketing</Badge>
						<Badge>support</Badge>
					</Flex>
				</div>
			</Example>

			<Example title="Row">
				<Flex gap="md">
					<Card>One</Card>
					<Card>Two</Card>
					<Card>Three</Card>
				</Flex>
			</Example>

			<Example title="Column">
				<Flex direction="col" gap="md" full>
					<Card>One</Card>
					<Card>Two</Card>
					<Card>Three</Card>
				</Flex>
			</Example>

			<Example title="Align and justify">
				<Card bg="none" className="w-full">
					<Flex gap="md" justify="between" align="center" full>
						<Card>Start</Card>
						<Card>Middle</Card>
						<Card>End</Card>
					</Flex>
				</Card>
			</Example>

			<Example title="Equal">
				<Flex gap="md" full className="*:flex-1">
					<Card>Narrow</Card>
					<Card>Wider content here</Card>
					<Card>Even wider content in this card</Card>
				</Flex>
			</Example>

			<Example title="Responsive direction">
				<Flex direction={{ initial: 'col', md: 'row' }} gap="md" full>
					<Card>One</Card>
					<Card>Two</Card>
					<Card>Three</Card>
				</Flex>
			</Example>

			<Example title="Composed with buttons">
				<Flex gap="md" justify="end" full>
					<Button variant="plain">Cancel</Button>
					<Button>Save changes</Button>
				</Flex>
			</Example>
		</>
	)
}
