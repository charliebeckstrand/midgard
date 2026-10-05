import { Badge } from 'ui/badge'
import { Flex } from 'ui/structure/flex'
import { formatRecord, isGraded, type Tally } from '../../utilities/grade'

/**
 * The record of a week, or of a season, in large type, and its points out of
 * the points a perfect run would score. It shows nothing until a pick is graded.
 */
export function TallyTotal({ tally, className }: { tally: Tally; className?: string }) {
	if (!isGraded(tally)) return null

	return (
		<Flex align="center" gap="md" className={className}>
			<span className="text-3xl/9 font-semibold tabular-nums">{formatRecord(tally)}</span>

			<Badge variant="soft" color="zinc" className="tabular-nums">
				{tally.points} / {tally.possible} pts
			</Badge>
		</Flex>
	)
}
