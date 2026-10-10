import { Badge } from 'ui/badge'
import { DateTime } from 'ui/date-time'
import { Rating } from 'ui/rating'
import { Text } from 'ui/text'
import { CATEGORY_BY_VALUE } from '../../constants'
import type { Place, PlaceCategory } from '../../types'
import { DAY_FORMAT } from '../../utilities/places-filter'
import { latestVisit } from '../../utilities/places-visits'
import { SummaryRow } from '../summary-drawer'

/**
 * The lines under a place's name: the score of the newest visit, then the date
 * of that visit, or the number of visits where there is more than one. They are
 * spans, because a list row puts them inside a button.
 */
function PlaceMeta({ place }: { place: Place }) {
	const latest = latestVisit(place)

	return (
		<>
			{latest.rating > 0 ? <Rating readOnly value={latest.rating} size="sm" /> : null}

			{place.visits.length > 1 ? (
				<Text as="span" tone="muted">
					{place.visits.length} visits
				</Text>
			) : (
				<Text as="span" tone="muted">
					<DateTime value={latest.visitedAt} format={DAY_FORMAT} />
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
