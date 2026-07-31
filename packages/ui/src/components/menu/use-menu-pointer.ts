'use client'

import { type PointerEvent, type RefObject, useCallback, useMemo, useRef, useState } from 'react'
import { createContext } from '../../core'
import { queryItems, setVirtualActive } from '../../hooks/a11y/use-a11y-roving'
import { MENUITEM_SELECTOR } from './use-menu-state'

/**
 * Slack (px) added to each end of the open panel's near edge when it forms the
 * base of the travel triangle, so a sweep aimed at the panel's first or last row
 * isn't ruled off-course by a pixel.
 *
 * @internal
 */
const TRAVEL_SLACK = 12

type Point = { x: number; y: number }

/**
 * Whether `point` lies in the corridor a pointer travels from `from` — the row
 * it set off from — into `rect`, the panel that row opened: the triangle with
 * its apex on the row and its base along the panel's facing edge, so it tapers
 * from the whole panel back to the point of departure.
 *
 * Measured along the run between the two, since the base is vertical: at
 * `progress` of the way across, the corridor spans the base interpolated back
 * toward the apex. Progress outside `(0, 1]` is a pointer standing still,
 * heading away, or already past the edge — never travel toward the panel, which
 * is what keeps one parked mid-corridor from freezing the cursor there.
 *
 * @internal
 */
function inCorridor(point: Point, from: Point, rect: DOMRect): boolean {
	const edge = rect.left >= from.x ? rect.left : rect.right

	const run = edge - from.x

	const progress = run === 0 ? 0 : (point.x - from.x) / run

	if (progress <= 0 || progress > 1) return false

	const top = from.y + progress * (rect.top - TRAVEL_SLACK - from.y)

	const bottom = from.y + progress * (rect.bottom + TRAVEL_SLACK - from.y)

	return point.y >= top && point.y <= bottom
}

/**
 * What one menu level does about the pointer: the arrivals that move its roving
 * cursor, and the submenu those arrivals open. A level is a panel — the root
 * {@link Menu} owns the first, and every {@link MenuSub} owns another for its own
 * rows — so at most one submenu hangs off each.
 *
 * @remarks Every member is stable for the level's lifetime, so a row that only
 * reports arrivals never re-renders on account of one. Which submenu is
 * currently open rides {@link MenuOpenSubContext} instead, read by the handful of
 * rows that are submenu parents.
 */
export type MenuPointerValue = {
	/**
	 * The pointer settled on `row` at `point` (client coordinates), which takes
	 * the roving cursor. `subKey` names it as a submenu's parent row, whose panel
	 * then becomes the level's open one.
	 */
	hoverRow: (row: HTMLElement, point: Point, subKey?: string) => void
	/** Opens `subKey` at once, displacing whatever is open — the click and keyboard paths. */
	openSubmenu: (subKey: string) => void
	/** Closes `subKey`, if it is the one open. */
	closeSubmenu: (subKey: string) => void
	/**
	 * Registers `subKey`'s floating panel, whose rect is the corridor
	 * ({@link inCorridor}) a travelling pointer is measured against. Called with
	 * `null` as the panel unmounts.
	 */
	registerPanel: (subKey: string, node: HTMLElement | null) => void
}

const [MenuPointerContext, useMenuPointer] = createContext<MenuPointerValue>('Menu')

/**
 * Key of the submenu open at the enclosing level, or `null` when none is. Split
 * from {@link MenuPointerContext} the way {@link MenuStateContext} is split from
 * {@link MenuActionsContext}, and for the same reason: this is the one value
 * that changes as the pointer sweeps, and only a {@link MenuSub} needs it.
 */
const [MenuOpenSubContext, useMenuOpenSub] = createContext<string | null>('Menu')

export { MenuOpenSubContext, MenuPointerContext, useMenuOpenSub, useMenuPointer }

/**
 * The `pointermove` handler a menu row reports its arrivals through, for the
 * enclosing level to make of what it will. `subKey` marks the row a submenu's
 * parent, so settling on it opens that submenu.
 *
 * @remarks `pointermove` rather than `pointerenter`: a menu opening under a
 * resting cursor must not seize the row it happens to cover, a pointer already
 * parked on a row the keyboard has since roved off of still takes the cursor
 * back on the first nudge, and the level reads a sweep's course off the
 * coordinates every move carries. Touch has no hover to express intent with — a
 * tap goes straight to selection, or to opening the submenu it lands on.
 */
export function useMenuRowPointer(
	disabled: boolean | undefined,
	subKey?: string,
): (event: PointerEvent<HTMLElement>) => void {
	const { hoverRow } = useMenuPointer()

	return useCallback(
		(event: PointerEvent<HTMLElement>) => {
			if (disabled || event.pointerType === 'touch') return

			hoverRow(event.currentTarget, { x: event.clientX, y: event.clientY }, subKey)
		},
		[disabled, hoverRow, subKey],
	)
}

/** Options for {@link useMenuPointerGroup}. */
type MenuPointerGroupOptions = {
	/**
	 * Rove by `data-active` and the owner's `aria-activedescendant` instead of
	 * real focus — the dropdown model, where focus rests on the trigger.
	 * @defaultValue false
	 */
	virtual?: boolean
	/** Virtual mode: the element carrying `aria-activedescendant` (a dropdown's trigger). */
	owner?: RefObject<HTMLElement | null>
}

/**
 * Owns one menu level's pointer cursor: the {@link MenuPointerValue} its rows
 * report arrivals through, plus the `openKey` naming the submenu those arrivals
 * have opened. The caller provides both to the level's rows.
 *
 * @remarks The pointer drives the same cursor the arrow keys do, so a menu
 * carries one highlight rather than a hover wash beside a stale focus ring, and
 * a keyboard rove picks up from the row the pointer left off on. Which cursor
 * that is follows the level's roving model: real focus for a right-click menu
 * and for every submenu panel, `data-active` plus the trigger's
 * `aria-activedescendant` for a dropdown, whose focus stays on its trigger.
 *
 * Nothing here waits on a clock. The cursor lands on the row under the pointer
 * in the same frame and the panels follow it there at once, so a menu answers a
 * sweep the way a scroll answers a wheel. What would otherwise need a grace
 * period — the diagonal from a parent row to a row inside the panel it opened,
 * which cuts across the rows between — is read off the pointer's course instead:
 * that corridor is the triangle from where the pointer left the parent row to
 * the panel's near edge ({@link inCorridor}), and arrivals inside it are the
 * sweep passing through, not a new destination. Geometry says what a timer would
 * have had to guess, and says it without holding anything up.
 */
export function useMenuPointerGroup({ virtual = false, owner }: MenuPointerGroupOptions = {}): {
	openKey: string | null
	pointer: MenuPointerValue
} {
	const [openKey, setOpenKey] = useState<string | null>(null)

	// Read back inside the handlers below, which run between a set and the render
	// that would refresh a closure over the state.
	const openKeyRef = useRef<string | null>(null)

	// Where the pointer last had a say — the apex of the travel triangle. It is
	// the parent row the open panel hangs off of, since that is the last arrival
	// this level accepted before the pointer set off toward the panel.
	const anchor = useRef<Point | null>(null)

	const panels = useRef(new Map<string, HTMLElement>())

	const setOpen = useCallback((next: string | null) => {
		openKeyRef.current = next

		setOpenKey(next)
	}, [])

	/** Seats the level's roving cursor on `row`, in whichever model it roves by. */
	const moveCursor = useCallback(
		(row: HTMLElement) => {
			if (!virtual) {
				// `preventScroll`: the row is already under the pointer, and letting
				// focus scroll the capped viewport would shift the list out from under
				// it mid-sweep. Keyboard roving still scrolls its target into view.
				if (document.activeElement !== row) row.focus({ preventScroll: true })

				return
			}

			// Real focus belongs on the owner in this model, and a trip into a
			// submenu's panel — which roves by focus — leaves it on a row of a panel
			// about to close. Coming back out hands it to the owner, or it would drop
			// to the document when that panel goes and take the keyboard with it.
			const controller = owner?.current

			if (controller && document.activeElement !== controller)
				controller.focus({ preventScroll: true })

			if (row.dataset.active !== undefined) return

			const items = queryItems(row.closest<HTMLElement>('[role="menu"]'), MENUITEM_SELECTOR)

			const index = items.indexOf(row)

			// `aria-selected` is not a `menuitem` state, so the highlight stays a
			// pure cursor — matching the dropdown's own roving.
			if (index !== -1) setVirtualActive(items, index, owner, { ariaSelected: false })
		},
		[virtual, owner],
	)

	/**
	 * Whether `point` is the pointer crossing this level on its way into the open
	 * submenu's panel. Rows caught under that sweep are passed over, not arrived
	 * at. An unplaced panel — one opened a frame ago, still measuring 0×0 — has no
	 * corridor to be in yet.
	 */
	const travelling = useCallback((point: Point): boolean => {
		const from = anchor.current

		const key = openKeyRef.current

		const panel = key === null ? undefined : panels.current.get(key)

		if (!from || !panel) return false

		const rect = panel.getBoundingClientRect()

		if (rect.width === 0 || rect.height === 0) return false

		return inCorridor(point, from, rect)
	}, [])

	const hoverRow = useCallback(
		(row: HTMLElement, point: Point, subKey?: string) => {
			const open = openKeyRef.current

			// Mid-sweep into the open panel: this row is being crossed, not chosen.
			if (open !== null && subKey !== open && travelling(point)) return

			anchor.current = point

			// Back on the row whose submenu is open: nothing to displace, and the
			// cursor must not be pulled out of the panel it may be sitting in.
			if (subKey !== undefined && subKey === open) return

			moveCursor(row)

			// What this row has the level show: its own submenu, or nothing.
			const next = subKey ?? null

			if (next !== open) setOpen(next)
		},
		[moveCursor, setOpen, travelling],
	)

	const closeSubmenu = useCallback(
		(subKey: string) => {
			if (openKeyRef.current === subKey) setOpen(null)
		},
		[setOpen],
	)

	const registerPanel = useCallback((subKey: string, node: HTMLElement | null) => {
		if (node) panels.current.set(subKey, node)
		else panels.current.delete(subKey)
	}, [])

	// Every member is stable, so this identity never changes: a sweep re-renders
	// only the rows that read `openKey`.
	const pointer = useMemo(
		() => ({ hoverRow, openSubmenu: setOpen, closeSubmenu, registerPanel }),
		[hoverRow, setOpen, closeSubmenu, registerPanel],
	)

	return { openKey, pointer }
}
