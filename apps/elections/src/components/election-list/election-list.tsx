import { Badge } from 'ui/badge'
import { Card } from 'ui/card'
import { Link } from 'ui/link'
import { Columns } from 'ui/structure/columns'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'
import { type Election, electionPath } from '../../elections/registry'

const STATUS: Record<Election['status'], { label: string; color: 'green' | 'blue' | 'zinc' }> = {
	live: { label: 'Live', color: 'green' },
	upcoming: { label: 'Upcoming', color: 'blue' },
	past: { label: 'Past', color: 'zinc' },
}

/** The day of an election, such as `November 3, 2026`. The day is a date, so it reads in UTC. */
function electionDay(date: string): string {
	return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
		dateStyle: 'long',
		timeZone: 'UTC',
	})
}

/** The elections of a list, each a card that leads to its overview. */
export function ElectionList({ elections }: { elections: readonly Election[] }) {
	return (
		<Columns columns={{ initial: 1, sm: 2, lg: 3 }}>
			{elections.map((election) => {
				const status = STATUS[election.status]

				return (
					<div key={electionPath(election)}>
						<Card
							href={electionPath(election)}
							render={<Link href={electionPath(election)} />}
							className="h-full transition-shadow hover:shadow-md"
						>
							{/* The status sits at the end, centered on the title and the date. */}
							<Flex justify="between" align="center" gap="md">
								<Stack gap="sm" className="min-w-0">
									<span className="font-semibold">
										{election.year} {election.name}
									</span>

									<span className="text-sm text-zinc-600 dark:text-zinc-400">
										{election.countryName}, {electionDay(election.date)}
									</span>
								</Stack>

								<Badge variant="soft" color={status.color} className="shrink-0">
									{status.label}
								</Badge>
							</Flex>
						</Card>
					</div>
				)
			})}
		</Columns>
	)
}
