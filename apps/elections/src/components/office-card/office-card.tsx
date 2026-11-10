import { Card } from 'ui/card'
import { Link } from 'ui/link'
import { Stack } from 'ui/structure/stack'
import type { Contest } from '../../elections/registry'
import { delegation } from '../../utilities/race-math'
import type { RaceEntry } from '../../utilities/results'
import { CardButton } from '../card-button'
import { DelegationSummary, RaceSummary } from '../race-summary'

/** Props for {@link OfficeCard}: the office, its races in the state, and where a pick goes. */
export type OfficeCardProps = {
	contest: Contest
	/** The races of the office in the state: one statewide race, or each district. */
	entries: readonly RaceEntry[]
} & (
	| {
			/** Moves the Drawer to the office. */
			onPick: () => void
			href?: never
	  }
	| {
			/** The page of the office in the state. */
			href: string
			onPick?: never
	  }
)

/**
 * A card of one office in the overview of a state: the office, then the race
 * or the delegation of the state. An office with no race in the state shows
 * nothing. The whole card is one control. In the Drawer, it is a button that
 * moves the Drawer to the office, as a race card is. On the page of a state, it
 * is a link to the page of the office in the state.
 */
export function OfficeCard({ contest, entries, onPick, href }: OfficeCardProps) {
	const [only] = entries

	if (only === undefined) return null

	// The gap under the title is the inset of the card, as in a race card, so the
	// title stands as far from the body as from the top edge.
	const body = (
		<Stack gap="md">
			<span className="text-base/6 font-semibold">{contest.label}</span>

			{contest.depth === 'district' ? (
				<DelegationSummary delegation={delegation(entries.map((race) => race.candidates))} />
			) : (
				<RaceSummary candidates={only.candidates} reporting={only.reporting} called={only.called} />
			)}
		</Stack>
	)

	if (href !== undefined) {
		return (
			<Card
				href={href}
				render={<Link href={href} />}
				className="h-full transition-shadow hover:shadow-md"
			>
				{body}
			</Card>
		)
	}

	return <CardButton onPick={onPick}>{body}</CardButton>
}
