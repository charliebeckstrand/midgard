import { CalendarCog, CalendarPlus, MapPinPlus, Pencil, Trash } from 'lucide-react'
import type { ContextMenuEntry } from 'ui/context-menu'
import { DateTime } from 'ui/date-time'
import type { Place, Trip, Visit } from '../../types'
import { DAY_FORMAT } from '../../utilities/places-filter'

/** What the menu of a place does. The caller opens the panels and asks for the confirmations. */
export type PlaceActions = {
	onAddVisit: (place: Place) => void
	onEditVisit: (place: Place, visit: Visit) => void
	onEdit: (place: Place) => void
	onDelete: (place: Place) => void
}

/**
 * The Edit visit row of the menu of a place. With one visit, the row opens it.
 * With more, the row opens a submenu of the days of the visits, newest first.
 *
 * The row lets a reader change a visit from a list of places, such as My
 * places, which shows no visits of its own.
 */
function editVisitItem(place: Place, actions: PlaceActions): ContextMenuEntry {
	const [only] = place.visits

	if (place.visits.length === 1 && only !== undefined) {
		return {
			key: 'edit-visit',
			label: 'Edit visit',
			icon: <CalendarCog />,
			onAction: () => actions.onEditVisit(place, only),
		}
	}

	return {
		key: 'edit-visit',
		label: 'Edit visit',
		icon: <CalendarCog />,
		disabled: place.visits.length === 0,
		items: place.visits.map((visit) => ({
			key: visit.id,
			label: <DateTime value={visit.visitedAt} format={DAY_FORMAT} />,
			onAction: () => actions.onEditVisit(place, visit),
		})),
	}
}

/** What the menu of one visit does. */
export type VisitActions = {
	onEditVisit: (place: Place, visit: Visit) => void
	onDeleteVisit: (place: Place, visit: Visit) => void
}

/** The rows of the menu of a place: Add visit, Edit visit, Edit place, and Delete place. */
export function placeMenuItems(place: Place, actions: PlaceActions): ContextMenuEntry[] {
	return [
		{
			key: 'visit',
			label: 'Add visit',
			icon: <CalendarPlus />,
			onAction: () => actions.onAddVisit(place),
		},
		editVisitItem(place, actions),
		{ key: 'edit', label: 'Edit place', icon: <Pencil />, onAction: () => actions.onEdit(place) },
		{
			key: 'delete',
			label: 'Delete place',
			icon: <Trash />,
			onAction: () => actions.onDelete(place),
		},
	]
}

/**
 * The rows of the menu of one visit: Edit visit and Delete visit. A place keeps
 * at least one visit, so the confirmation of a delete of the only visit says
 * that the place goes too.
 */
export function visitMenuItems(
	place: Place,
	visit: Visit,
	actions: VisitActions,
): ContextMenuEntry[] {
	return [
		{
			key: 'edit',
			label: 'Edit visit',
			icon: <Pencil />,
			onAction: () => actions.onEditVisit(place, visit),
		},
		{
			key: 'delete',
			label: 'Delete visit',
			icon: <Trash />,
			onAction: () => actions.onDeleteVisit(place, visit),
		},
	]
}

/** What the menu of a trip does. */
export type TripActions = {
	/** Opens the place form with the trip picked and the date on the first day of the trip. */
	onAddPlace: (trip: Trip) => void
	onEditTrip: (trip: Trip) => void
	onDeleteTrip: (trip: Trip) => void
}

/** The rows of the menu of a trip: Add place, Edit trip, and Delete trip. */
export function tripMenuItems(trip: Trip, actions: TripActions): ContextMenuEntry[] {
	return [
		{
			key: 'place',
			label: 'Add place',
			icon: <MapPinPlus />,
			onAction: () => actions.onAddPlace(trip),
		},
		{ key: 'edit', label: 'Edit trip', icon: <Pencil />, onAction: () => actions.onEditTrip(trip) },
		{
			key: 'delete',
			label: 'Delete trip',
			icon: <Trash />,
			onAction: () => actions.onDeleteTrip(trip),
		},
	]
}
