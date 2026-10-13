/** The indent of one depth in the windowed tree, in rem. It equals `k.indent` (`ps-5`) of a nested group. */
export const INDENT_REM = 1.25

export const DEFAULT_ROW_HEIGHT = 24
export const DEFAULT_OVERSCAN = 20

/**
 * The items that roving reaches: each treeitem that is not in an exiting
 * group. A closed group stays in the DOM for its exit, and `JsonTreeGroup`
 * gives it `data-exiting` for that time. The group unmounts at the end of the
 * exit, so a row in it cannot keep focus.
 */
export const ROVING_ITEM_SELECTOR =
	'[role="treeitem"]:not([data-slot="json-group"][data-exiting] *)'
