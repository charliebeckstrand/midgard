import type { MouseEvent, RefObject } from 'react'
import type { GridMenuItem } from '../types'

/** Opens the menu with a point's resolved items; an empty/absent set no-ops. @internal */
export type CommitMenu = (
	items: GridMenuItem[] | null,
	anchor: HTMLElement,
	x: number,
	y: number,
) => void

/**
 * Handles a right-click that landed on a group-header row: resolves its menu by
 * the group's shared value (`data-group-key`) and opens it at the pointer.
 * Returns whether the target was a group row — checked first, since a group
 * header's aggregate cells carry `data-grid-col` but aren't ordinary body cells,
 * and its label cell carries none at all.
 *
 * @internal
 */
export function tryGroupMenu(
	target: HTMLElement,
	event: MouseEvent<HTMLDivElement>,
	resolveGroupItems: (key: string) => GridMenuItem[] | null,
	commit: CommitMenu,
): boolean {
	const groupRow = target.closest<HTMLElement>('tr[data-group-row]')

	if (groupRow?.dataset.groupKey === undefined) return false

	commit(resolveGroupItems(groupRow.dataset.groupKey), target, event.clientX, event.clientY)

	return true
}

/**
 * Handles a right-click that landed on a column-group band cell (its badge):
 * resolves its menu by the group's id (`data-group-id`) and opens it at the
 * pointer. Returns whether the target was a band cell — checked before the plain
 * cell path, since a band cell carries no `data-grid-col`.
 *
 * @internal
 */
export function tryColumnGroupMenu(
	target: HTMLElement,
	event: MouseEvent<HTMLDivElement>,
	resolveColumnGroupItems: (id: string) => GridMenuItem[] | null,
	commit: CommitMenu,
): boolean {
	const band = target.closest<HTMLElement>('th[data-group-band]')

	if (band?.dataset.groupId === undefined) return false

	commit(resolveColumnGroupItems(band.dataset.groupId), target, event.clientX, event.clientY)

	return true
}

/**
 * Handles a right-click that landed on a header or data cell: resolves its
 * column/cell menu and opens it at the pointer. Returns whether the target was a
 * cell.
 *
 * @internal
 */
export function tryCellMenu(
	target: HTMLElement,
	event: MouseEvent<HTMLDivElement>,
	resolveItems: (target: HTMLElement) => GridMenuItem[] | null,
	commit: CommitMenu,
): boolean {
	const cell = target.closest<HTMLElement>('td[data-grid-col], th[data-grid-col]')

	if (!cell) return false

	commit(resolveItems(cell), target, event.clientX, event.clientY)

	return true
}

/**
 * Handles a keyboard context menu (Shift+F10 / the ContextMenu key), which fires
 * on the focused grid rather than a cell: retargets to the active cursor cell,
 * records the grid to restore focus to on close, and opens below the cell
 * (WCAG 2.1.1). No-ops when no cell is active.
 *
 * @internal
 */
export function openKeyboardMenu(
	target: HTMLElement,
	resolveItems: (target: HTMLElement) => GridMenuItem[] | null,
	commit: CommitMenu,
	returnFocus: RefObject<HTMLElement | null>,
): void {
	const grid = target.closest<HTMLElement>('[role="grid"]')

	const active = grid?.querySelector<HTMLElement>('[data-active]')

	if (!active) return

	const items = resolveItems(active)

	if (!items || items.length === 0) return

	returnFocus.current = grid

	const rect = active.getBoundingClientRect()

	commit(items, active, rect.left, rect.bottom)
}

/**
 * Resolves a right-click to its header or cell menu items, or `null` when it hit
 * neither a header nor a data cell.
 *
 * @internal
 */
export function resolveTarget(
	target: HTMLElement,
	resolveColumn: (columnId: string) => GridMenuItem[] | null,
	resolveCell: (columnId: string, rowKey: string, text: string) => GridMenuItem[] | null,
): GridMenuItem[] | null {
	const th = target.closest<HTMLElement>('th[data-grid-col]')

	if (th?.dataset.gridCol !== undefined) return resolveColumn(th.dataset.gridCol)

	const td = target.closest<HTMLElement>('td[data-grid-col]')

	if (td?.dataset.gridCol === undefined) return null

	const rowKey = td.closest<HTMLElement>('tr[data-grid-row]')?.dataset.gridRow

	if (rowKey === undefined) return null

	return resolveCell(td.dataset.gridCol, rowKey, td.textContent ?? '')
}
