'use client'

import { type ReactNode, type RefObject, useCallback, useMemo, useRef, useState } from 'react'
import { queryItems, setVirtualActiveElement } from '../../hooks/a11y/use-a11y-roving'
import { MenuOpenSubContext, MenuPointerContext, type MenuPointerValue } from './context'
import { MENUITEM_SELECTOR } from './use-menu-root'

/**
 * Slack (px) added to each end of the open panel's near edge when it forms the
 * base of the travel triangle. A sweep aimed at the panel's first or last row
 * is therefore not ruled off-course by a pixel.
 *
 * @internal
 */
const TRAVEL_SLACK = 12

type Point = { x: number; y: number }

/**
 * Which end of an open submenu each key seats the cursor on. Down and Home enter
 * at the top, Up and End at the bottom. Those are the same ends they would reach
 * in the menu the row sits in, applied to the panel that has taken navigation
 * over.
 *
 * @internal
 */
const SUBMENU_ENTRY: Record<string, 'first' | 'last' | undefined> = {
	ArrowDown: 'first',
	Home: 'first',
	ArrowUp: 'last',
	End: 'last',
}

/**
 * Whether `point` lies in the corridor a pointer travels from `from` (the row
 * it set off from) into `rect`, the panel that row opened. The corridor is the
 * triangle with its apex on the row and its base along the panel's facing edge.
 * It therefore tapers from the whole panel back to the point of departure.
 *
 * Measured along the run between the two, since the base is vertical. At
 * `progress` of the way across, the corridor spans the base interpolated back
 * toward the apex. Progress outside `(0, 1]` is a pointer already past the
 * edge, or behind the apex.
 *
 * Travel is also a move toward the panel, measured from `prev`, the sample
 * before `point`. A pointer that stands still, drifts up or down, or heads away
 * inside the corridor is not traveling. Without that check, a pointer parked
 * mid-corridor reads the same progress from the apex on each move, and the
 * cursor freezes there.
 *
 * @internal
 */
function inCorridor(point: Point, prev: Point, from: Point, rect: DOMRect): boolean {
	const edge = rect.left >= from.x ? rect.left : rect.right

	const run = edge - from.x

	const progress = run === 0 ? 0 : (point.x - from.x) / run

	if (progress <= 0 || progress > 1) return false

	if (Math.sign(run) * (point.x - prev.x) <= 0) return false

	const top = from.y + progress * (rect.top - TRAVEL_SLACK - from.y)

	const bottom = from.y + progress * (rect.bottom + TRAVEL_SLACK - from.y)

	return point.y >= top && point.y <= bottom
}

/** Props for {@link MenuPointerLevel}. */
export type MenuPointerLevelProps = {
	/**
	 * Rove by `data-active` and the owner's `aria-activedescendant` instead of
	 * real focus: the dropdown model, where focus rests on the trigger.
	 * @defaultValue false
	 */
	virtual?: boolean
	/** Virtual mode: the element carrying `aria-activedescendant` (a dropdown's trigger). */
	owner?: RefObject<HTMLElement | null>
	/** The level's rows, and any submenu panels hanging off them. */
	children: ReactNode
}

/**
 * Owns one menu level's pointer cursor: the {@link MenuPointerValue} its rows
 * report arrivals through, plus the `openKey` naming the submenu those arrivals
 * have opened.
 *
 * @remarks The pointer drives the same cursor the arrow keys do. A menu
 * therefore carries one highlight, rather than a hover wash beside a stale
 * focus ring. A keyboard rove picks up from the row the pointer left off on.
 * Which cursor that is follows the level's roving model. It is real focus for a
 * right-click menu and for every submenu panel. It is `data-active` plus the
 * trigger's `aria-activedescendant` for a dropdown, whose focus stays on its
 * trigger.
 *
 * Nothing here waits on a clock. The cursor lands on the row under the pointer
 * in the same frame, and the panels follow it there at once. A menu therefore
 * answers a sweep the way a scroll answers a wheel. One move would otherwise
 * need a grace period. That is the diagonal from a parent row to a row inside
 * the panel it opened, which cuts across the rows between. It is read off the
 * pointer's course instead. That corridor is the triangle from where the pointer left the
 * parent row to the panel's near edge ({@link inCorridor}). Arrivals inside it
 * are the sweep passing through, not a new destination. Geometry says what a
 * timer would have had to guess, and says it without holding anything up.
 *
 * The level provides both halves itself rather than handing them back, so no
 * caller can wire one without the other. `openKey` changes on every sweep. It
 * re-renders neither the menu nor the row that owns the panel's subtree, only
 * the rows that read it.
 */
export function MenuPointerLevel({ virtual = false, owner, children }: MenuPointerLevelProps) {
	const [openKey, setOpenKey] = useState<string | null>(null)

	// Read back inside the handlers below, which run between a set and the render
	// that would refresh a closure over the state.
	const openKeyRef = useRef<string | null>(null)

	// Where the pointer last had a say: the apex of the travel triangle. It is
	// the parent row the open panel hangs off of, since that is the last arrival
	// this level accepted before the pointer set off toward the panel.
	const anchor = useRef<Point | null>(null)

	// The pointer sample before the one under judgment, so travel can be told
	// from a pointer that stopped or turned back.
	const prevPoint = useRef<Point | null>(null)

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
			// submenu's panel (which roves by focus) leaves it on a row of a panel
			// about to close. Coming back out hands it to the owner, or it would drop
			// to the document when that panel goes and take the keyboard with it.
			const controller = owner?.current

			if (controller && document.activeElement !== controller)
				controller.focus({ preventScroll: true })

			if (row.dataset.active !== undefined) return

			// Addressed by element, not by index: the arrival carries its own row, so
			// reading the panel's whole item list back out to find that row's index
			// would put three linear passes on a sweep that moves one attribute.
			// `aria-selected` is not a `menuitem` state, so the highlight stays a
			// pure cursor, as in the dropdown's own roving.
			setVirtualActiveElement(
				row.closest<HTMLElement>('[role="menu"]'),
				row,
				MENUITEM_SELECTOR,
				owner,
				{
					ariaSelected: false,
				},
			)
		},
		[virtual, owner],
	)

	/**
	 * Whether `point` is the pointer crossing this level on its way into the open
	 * submenu's panel. Rows caught under that sweep are passed over, not arrived
	 * at. An unplaced panel (one opened a frame ago, still measuring 0×0) has no
	 * corridor to be in yet.
	 */
	const traveling = useCallback((point: Point, prev: Point | null): boolean => {
		const from = anchor.current

		const key = openKeyRef.current

		const panel = key === null ? undefined : panels.current.get(key)

		if (!from || !panel) return false

		const rect = panel.getBoundingClientRect()

		if (rect.width === 0 || rect.height === 0) return false

		return inCorridor(point, prev ?? from, from, rect)
	}, [])

	const hoverRow = useCallback(
		(row: HTMLElement, point: Point, subKey?: string) => {
			const open = openKeyRef.current

			const prev = prevPoint.current

			prevPoint.current = point

			// Mid-sweep into the open panel: this row is being crossed, not chosen.
			// `traveling` reads the open key back itself, and says no when none is.
			if (subKey !== open && traveling(point, prev)) return

			anchor.current = point

			// Back on the row whose submenu is open: nothing to displace, and the
			// cursor must not be pulled out of the panel where it sits.
			if (subKey !== undefined && subKey === open) return

			moveCursor(row)

			// What this row has the level show: its own submenu, or nothing.
			const next = subKey ?? null

			if (next !== open) setOpen(next)
		},
		[moveCursor, setOpen, traveling],
	)

	const enterSubmenu = useCallback((key: string) => {
		const edge = SUBMENU_ENTRY[key]

		if (!edge) return false

		const openSub = openKeyRef.current

		const panel = openSub === null ? undefined : panels.current.get(openSub)

		if (!panel) return false

		const rows = queryItems(panel, MENUITEM_SELECTOR)

		const row = edge === 'first' ? rows[0] : rows.at(-1)

		if (!row) return false

		// No `preventScroll` here, unlike the pointer's cursor: the keyboard is
		// reaching for a row it cannot see, so bringing it into view is the point.
		row.focus()

		return true
	}, [])

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
		() => ({
			hoverRow,
			openSubmenu: setOpen,
			enterSubmenu,
			closeSubmenu,
			moveCursor,
			registerPanel,
		}),
		[hoverRow, setOpen, enterSubmenu, closeSubmenu, moveCursor, registerPanel],
	)

	return (
		<MenuPointerContext value={pointer}>
			<MenuOpenSubContext value={openKey}>{children}</MenuOpenSubContext>
		</MenuPointerContext>
	)
}
