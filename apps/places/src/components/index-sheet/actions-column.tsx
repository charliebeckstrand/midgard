import type { ContextMenuEntry } from 'ui/context-menu'
import type { GridColumn } from 'ui/modules/grid'
import { PlaceMenu } from '../place-menu'

/**
 * The actions column of My places and My trips: the ellipsis menu of each row.
 *
 * @param items - The rows of the menu of a record.
 * @param name - The name of a record, which names its menu.
 */
export function actionsColumn<T>(
	items: (row: T) => ContextMenuEntry[],
	name: (row: T) => string,
): GridColumn<T> {
	return {
		id: 'actions',
		// The ellipsis says what the column is, so the header names it for a
		// screen reader alone.
		title: <span className="sr-only">Actions</span>,
		// The grid does not size an `actions` column to its content. Without a
		// `width`, the column takes the default of 150px. This width holds the
		// ellipsis button (38px at the `md` step) and the cell padding (8px on
		// each side).
		width: 54,
		actions: (row) => <PlaceMenu items={items(row)} aria-label={`Actions for ${name(row)}`} />,
	}
}
