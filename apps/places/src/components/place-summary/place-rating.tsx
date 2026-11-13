'use client'

import { Rating } from 'ui/rating'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'
import type { Place } from '../../types'
import { ratedVisit } from '../../utilities/places-visits'
import { useDayText } from '../day-text'

/**
 * The rating of a place: the rating of its newest rated visit, or nothing where
 * no visit has a rating.
 *
 * The tooltip gives the day of that visit, because a place has a rating on
 * each visit, and the reader must know which one this is. The name of the
 * stars gives the same day to a screen reader, because the trigger takes no
 * focus.
 *
 * Set `tooltip` to `false` inside a row that is one button. The button
 * stretches its hit area over its content, so no hover gets to the stars.
 */
export function PlaceRating({ place, tooltip = true }: { place: Place; tooltip?: boolean }) {
	const visit = ratedVisit(place)

	const text = useDayText()

	if (visit === undefined) return null

	const day = text.day(visit.visitedAt)

	const source = day === undefined ? 'From your visit' : `From your visit on ${day}`

	const stars = <Rating readOnly value={visit.rating} size="sm" aria-label={source} />

	if (!tooltip) return stars

	return (
		<Tooltip>
			<TooltipTrigger>
				<span>{stars}</span>
			</TooltipTrigger>

			<TooltipContent>{source}</TooltipContent>
		</Tooltip>
	)
}
