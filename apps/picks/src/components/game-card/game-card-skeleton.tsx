import { Card } from 'ui/card'
import { Placeholder } from 'ui/placeholder'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'

/** One side of a game while it loads: a logo and a name. */
function TeamRowSkeleton({ width }: { width: string }) {
	return (
		<Flex align="center" gap="md">
			<Placeholder className="size-8 shrink-0 rounded-full" />

			<Placeholder className={width} />
		</Flex>
	)
}

/** The shape of a game card with no pick, for a week that loads. */
export function GameCardSkeleton() {
	return (
		<Card>
			<Flex align="center" gap="md">
				<Stack gap="sm" className="min-w-0 flex-1">
					<TeamRowSkeleton width="w-40" />

					<TeamRowSkeleton width="w-32" />
				</Stack>

				<Placeholder className="w-20" />
			</Flex>
		</Card>
	)
}
