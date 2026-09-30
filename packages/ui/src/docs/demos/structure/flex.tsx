import { Button } from '../../../components/button'
import { Card } from '../../../components/card'
import { Flex } from '../../../structure/flex'
import { Axes, Example } from '../../engine'

// The frame fixes a width and a height, so the wrap and the fill show. The dashed
// border shows the bounds of the Flex.
const FRAME =
	'flex h-44 w-64 overflow-hidden rounded-lg border border-zinc-950/10 p-2 dark:border-white/10'

const BOUNDS = 'rounded-md border border-dashed border-zinc-400 p-1 dark:border-zinc-600'

const ITEM = 'flex h-7 items-center rounded-md bg-zinc-950/5 px-2 text-sm dark:bg-white/10'

const ITEMS = ['One', 'Two', 'Three', 'Four', 'Five']

export function Demo() {
	return (
		<>
			<Axes
				of="Flex"
				omit={['as']}
				render={(props, label) => (
					<div className="flex flex-col gap-1">
						<span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
						<div className={FRAME}>
							<Flex gap="sm" className={BOUNDS} {...props}>
								{ITEMS.map((item) => (
									<div key={item} className={ITEM}>
										{item}
									</div>
								))}
							</Flex>
						</div>
					</div>
				)}
			/>

			<Example title="Row">
				<Flex gap="md">
					<Card>One</Card>
					<Card>Two</Card>
					<Card>Three</Card>
				</Flex>
			</Example>

			<Example title="Column">
				<Flex direction="col" gap="md">
					<Card>One</Card>
					<Card>Two</Card>
					<Card>Three</Card>
				</Flex>
			</Example>

			<Example title="Align and justify">
				<Card bg="none">
					<Flex gap="md" justify="between" align="center" full>
						<Card>Start</Card>
						<Card>Middle</Card>
						<Card>End</Card>
					</Flex>
				</Card>
			</Example>

			<Example title="Equal">
				<Flex gap="md" className="*:flex-1">
					<Card>Narrow</Card>
					<Card>Wider content here</Card>
					<Card>Even wider content in this card</Card>
				</Flex>
			</Example>

			<Example title="Responsive direction">
				<Flex direction={{ initial: 'col', md: 'row' }} gap="md">
					<Card>One</Card>
					<Card>Two</Card>
					<Card>Three</Card>
				</Flex>
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
