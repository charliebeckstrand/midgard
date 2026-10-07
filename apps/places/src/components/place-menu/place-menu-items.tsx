import { CalendarPlus, Pencil, Trash } from 'lucide-react'
import type { ContextMenuEntry } from 'ui/context-menu'
import type { Place, Visit } from '../../types'

/** What the menu of a place does. The caller opens the panels and asks for the confirmations. */
export type PlaceActions = {
	onAddVisit: (place: Place) => void
	onEdit: (place: Place) => void
	onDelete: (place: Place) => void
}

/** What the menu of one visit does. */
export type VisitActions = {
	onEditVisit: (place: Place, visit: Visit) => void
	onDeleteVisit: (place: Place, visit: Visit) => void
}

/** The rows of the menu of a place: Add visit, Edit place, and Delete place. */
export function placeMenuItems(place: Place, actions: PlaceActions): ContextMenuEntry[] {
	return [
		{
			key: 'visit',
			label: 'Add visit',
			icon: <CalendarPlus />,
			onAction: () => actions.onAddVisit(place),
		},
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
