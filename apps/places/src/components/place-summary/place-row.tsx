import { Badge } from 'ui/badge'
import { useIntl } from 'ui/primitives/intl'
import { Text } from 'ui/text'
import { CATEGORY_BY_VALUE } from '../../constants'
import type { Place, PlaceCategory } from '../../types'
import { latestVisit } from '../../utilities/places-visits'
import { DayText } from '../day-text'
import { SummaryRow } from '../summary-drawer'
import { PlaceRating } from './place-rating'

/**
 * The lines under a place's name: the score of the newest rated visit, then the
 * date of the newest visit, or the number of visits where there is more than
 * one. They are spans, because a list row puts them inside a button.
 */
function PlaceMeta({ place }: { place: Place }) {
	const intl = useIntl()

	const latest = latestVisit(place)

	return (
		<>
			<PlaceRating place={place} tooltip={false} />

			{place.visits.length > 1 ? (
				<Text as="span" tone="muted">
					{intl.formatNumber(place.visits.length)} visits
				</Text>
			) : (
				<Text as="span" tone="muted">
					<DayText value={latest.visitedAt} />
				</Text>
			)}
		</>
	)
}

/** The badge of a category, or nothing for a category that the app does not know. */
function PlaceCategoryBadge({ category }: { category: PlaceCategory }) {
	const meta = CATEGORY_BY_VALUE.get(category)

	return meta ? <Badge color={meta.color}>{meta.label}</Badge> : null
}

/**
 * One place as a row of a list: its name, the lines under it, and its category
 * badge. A press opens the place.
 */
export function PlaceRow({ place, onOpen }: { place: Place; onOpen: (id: string) => void }) {
	return (
		<SummaryRow
			name={place.name}
			meta={<PlaceMeta place={place} />}
			end={<PlaceCategoryBadge category={place.category} />}
			onOpen={() => onOpen(place.id)}
		/>
	)
}
