'use client'

import { autoPlacement, type Middleware, offset, shift } from '@floating-ui/react'
import { ChevronRight } from 'lucide-react'
import {
	type FocusEvent,
	type KeyboardEvent,
	type ReactElement,
	type ReactNode,
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
} from 'react'
import { ariaAttr, cn, dataAttr } from '../../core'
import { useFloatingUI, useScrollOverflow } from '../../hooks'
import { useFloatingReference } from '../../hooks/use-floating-reference'
import { useDensity } from '../../primitives/density'
import { FloatingSurface } from '../../primitives/floating-surface'
import { PopoverPanel } from '../../primitives/popover'
import { useGlass } from '../../providers/glass/context'
import { k } from '../../recipes/kata/menu'
import { Icon } from '../icon'
import { useMenuCapped } from './context'
import { MenuLabel } from './slots'
import {
	MenuPointerLevel,
	useMenuOpenSub,
	useMenuPointer,
	useMenuRowPointer,
} from './use-menu-pointer'
import { MENUITEM_SELECTOR } from './use-menu-state'

/**
 * Keys that open a submenu from its roved parent row. Direction keys are
 * deliberately absent: the panel takes whichever side has room
 * ({@link SUBMENU_MIDDLEWARE}), so ArrowRight would open a panel that lands on
 * the left as often as not.
 *
 * @internal
 */
const OPEN_KEYS = ['Enter', ' ']

/**
 * Positions the panel beside its parent row on whichever side has the most
 * room, rather than committing to one and flipping only once it overflows:
 * `autoPlacement` measures both edges every reposition, so a menu opened near
 * the right edge of the viewport opens leftward from the start instead of being
 * clipped. Restricted to the horizontal sides — a submenu above or below its
 * parent would cover the menu it came from — and top-aligned with the row it
 * hangs off, with `shift` nudging it back into view when it runs past the
 * bottom.
 *
 * @internal
 */
const SUBMENU_MIDDLEWARE: Middleware[] = [
	offset(4),
	autoPlacement({ allowedPlacements: ['right-start', 'left-start'] }),
	shift({ padding: 8 }),
]

/** Props for {@link MenuSub}. */
export type MenuSubProps = {
	/** The parent row's label. */
	label: ReactNode
	/** Leading icon element (e.g. a Lucide icon), rendered through `Icon`. */
	icon?: ReactElement
	/** Render the parent row inert and dimmed; the submenu never opens. @defaultValue false */
	disabled?: boolean
	className?: string
	/** The submenu's own rows — {@link MenuItem}s and {@link MenuSeparator}s. */
	children: ReactNode
}

/**
 * A menu row that opens a nested menu beside itself: a `role="menuitem"` parent
 * carrying `aria-haspopup="menu"` and a trailing chevron, plus the floating
 * panel its rows render in. Opens on hover, on click, and — while the row is
 * the roved one — on Enter / Space; closes on `Escape`, an outside press, or the
 * cursor settling on another row. Selecting a row inside closes the whole menu,
 * as any {@link MenuItem} does.
 *
 * @remarks **An open submenu owns the arrows.** However it was opened, the
 * navigation keys work its rows and wrap inside them rather than roving on
 * through the menu the row sits in, which would leave the panel hanging open
 * behind the cursor; `Escape` closes it and hands them back, cursor on the
 * parent row. A hover open leaves focus on that row until the first such key —
 * hover is not a commitment (APG) — while Enter, Space, and click seat it on the
 * panel's first row outright.
 *
 * The panel takes whichever side of the row has room
 * ({@link SUBMENU_MIDDLEWARE}), so it opens leftward near the viewport's right
 * edge rather than being clipped — which is why no direction key opens or closes
 * it. Open state is the enclosing level's, not this row's
 * ({@link MenuPointerLevel}), so one submenu hangs off a menu at a time and the
 * pointer reads its course against that one panel; the row's own panel provides
 * the next level down. Tab is held inside the open panel, cycling its rows. The
 * panel portals out of the enclosing {@link MenuContent}, so its height-capped,
 * scrolling viewport can't clip it. A dropdown keeps focus on its trigger and
 * roves by `aria-activedescendant`, so the arrows for a submenu open under one
 * arrive there instead; {@link MenuTrigger} hands them over the same way.
 * @see {@link MenuItem}
 */
export function MenuSub({ label, icon, disabled = false, className, children }: MenuSubProps) {
	const { space, size } = useDensity()

	// The parent menu's height policy, so a submenu panel caps (or doesn't) the
	// same way the menu it hangs off does.
	const capped = useMenuCapped()

	const glass = useGlass()

	const triggerRef = useRef<HTMLButtonElement>(null)

	const subKey = useId()

	// The enclosing level's cursor: it holds which of its submenus is open, so
	// arbitration between siblings — and the travel geometry the pointer paths
	// read — lives in one place rather than in each row's own timers.
	const { openSubmenu, enterSubmenu, closeSubmenu, registerPanel } = useMenuPointer()

	const open = useMenuOpenSub() === subKey

	// Whether the pending open should pull focus into the panel: set by the
	// keyboard and click paths, left clear by hover so a pointer sweep across the
	// menu doesn't yank focus off whatever the user is on.
	const seatFocus = useRef(false)

	// The panel's rows scroll in the same capped, edge-faded viewport
	// {@link MenuContent} gives the root menu, so a long submenu reads alike.
	const scrollOverflowRef = useScrollOverflow()

	// The panel's row container once it mounts. State, not a ref: the portal
	// renders its children a commit *after* `open` flips, so the focus-seating
	// effect below needs a re-render to fire on — an `open`-keyed effect alone
	// would run against an empty panel.
	const [rows, setRows] = useState<HTMLElement | null>(null)

	const setRowContainer = useCallback(
		(node: HTMLElement | null) => {
			setRows(node)

			scrollOverflowRef(node)
		},
		[scrollOverflowRef],
	)

	const triggerId = useId()

	const panelId = useId()

	const { refs, floatingStyles, getReferenceProps, getFloatingProps } = useFloatingUI({
		// A starting point only: `SUBMENU_MIDDLEWARE`'s `autoPlacement` resolves the
		// side on every reposition.
		placement: 'right-start',
		middleware: SUBMENU_MIDDLEWARE,
		open,
		// Only dismissals arrive here — the composed interactions are `useDismiss`
		// and `useRole`, and neither ever reports an open.
		onOpenChange: () => closeSubmenu(subKey),
		// The trigger (`role="menuitem"` + `aria-haspopup`) and the panel
		// (`role="menu"`) carry their own roles; a role here would stamp the
		// positioning wrapper with a duplicate.
		role: null,
		// No `returnFocusTo`: a close the pointer drove never held focus, and
		// restoring it to this row would drag the cursor backwards onto a submenu
		// the user has already left — and, worse, blur whichever row the pointer
		// has since opened, closing it. The keyboard paths that *do* owe a return
		// (`collapse`) seat it on the trigger themselves.
	})

	// Seat focus on the first row of a keyboard- or click-opened submenu, once the
	// panel's rows are in the DOM. Keyed on `open` as well as the container: a
	// reopen inside the exit animation reuses the node it was already holding, so
	// the container alone would not change and the seating would never run.
	useEffect(() => {
		if (!open || !rows || !seatFocus.current) return

		seatFocus.current = false

		rows.querySelector<HTMLElement>(MENUITEM_SELECTOR)?.focus()
	}, [open, rows])

	const openWithFocus = useCallback(() => {
		// Already open, from a hover the pointer left standing: there is no mount
		// coming to seat focus on, so take it now. Arming the flag instead would
		// leave it set for whatever opens next.
		if (open && enterSubmenu('ArrowDown')) return

		seatFocus.current = true

		openSubmenu(subKey)
	}, [open, enterSubmenu, openSubmenu, subKey])

	// Its own `<button>`, so no cloned child's ref joins here. A submenu unmounts
	// inside its parent menu's deletion, which is exactly where nulling the
	// reference can cascade, so it takes the guarded composition too.
	const setTrigger = useFloatingReference<HTMLButtonElement>(
		refs.setReference,
		triggerRef,
		undefined,
	)

	// The positioned wrapper doubles as the panel's rect for the level's travel
	// triangle; it shrink-wraps the panel (see the `relative` note below), so the
	// two measure alike.
	const setPanel = useCallback(
		(node: HTMLElement | null) => {
			refs.setFloating(node)

			registerPanel(subKey, node)
		},
		[refs, registerPanel, subKey],
	)

	/** Collapses the submenu and hands the cursor back to its parent row. */
	const collapse = useCallback(() => {
		closeSubmenu(subKey)

		triggerRef.current?.focus()
	}, [closeSubmenu, subKey])

	const handleTriggerKeyDown = useCallback(
		(event: KeyboardEvent<HTMLButtonElement>) => {
			if (disabled) return

			if (OPEN_KEYS.includes(event.key)) {
				event.preventDefault()

				openWithFocus()

				return
			}

			// `Escape` collapses an open submenu from its parent row, and is consumed
			// so the enclosing menu — which closes on any `Escape` reaching its panel
			// — survives to take the next press.
			if (event.key === 'Escape' && open) {
				event.preventDefault()

				event.stopPropagation()

				collapse()

				return
			}

			// An open submenu owns the arrows: they move within its rows rather than
			// roving on through the menu this row sits in, which would leave the
			// panel hanging open behind the cursor. Consumed here so the enclosing
			// menu's roving never sees the press; `Escape` above is the way back out.
			if (open && enterSubmenu(event.key)) {
				event.preventDefault()

				event.stopPropagation()
			}
		},
		[disabled, open, openWithFocus, collapse, enterSubmenu],
	)

	const handlePanelKeyDown = useCallback(
		(event: KeyboardEvent) => {
			// The panel is portaled out of the DOM but stays a React child of this
			// row, so its keystrokes bubble back through the *enclosing* menu's
			// roving handler — which would read the focused submenu row as "nothing
			// of mine focused" and yank focus to its own first item on the next
			// arrow or Tab. The submenu owns its keyboard model; nothing escapes it.
			// Runs after `PopoverPanel`'s own roving, which fires first.
			//
			// React's `stopPropagation` stops the native event too, so the
			// document-level dismiss layer never sees a press from in here — hence
			// `Escape` is closed out below rather than left to that layer.
			event.stopPropagation()

			if (event.key !== 'Escape') return

			event.preventDefault()

			collapse()
		},
		[collapse],
	)

	// Roving off the parent row collapses its submenu, so at most one hangs open
	// and the arrow keys always act on the row the cursor is actually sitting on.
	// Focus landing *inside* the panel is the open completing, not a rove away —
	// tested against the row container, which is mounted by the time focus can
	// reach a row (floating-ui's own floating ref settles a commit later).
	const handleBlur = useCallback(
		(event: FocusEvent<HTMLButtonElement>) => {
			if (event.relatedTarget && rows?.contains(event.relatedTarget)) return

			closeSubmenu(subKey)
		},
		[closeSubmenu, rows, subKey],
	)

	// The pointer settling on this row takes the level's cursor and opens this
	// submenu — the level holds both, so a sweep across sibling rows resolves to
	// one panel rather than a flash per row.
	const handlePointerMove = useMenuRowPointer(disabled, subKey)

	return (
		<>
			<button
				id={triggerId}
				ref={setTrigger}
				type="button"
				role="menuitem"
				// Focus roves through the menu's own key handling, never the tab order.
				tabIndex={-1}
				aria-haspopup="menu"
				aria-expanded={open}
				aria-controls={open ? panelId : undefined}
				aria-disabled={ariaAttr(disabled)}
				data-disabled={dataAttr(disabled)}
				data-slot="menu-sub-trigger"
				// The open parent row stays washed (`k.subTrigger`) while the pointer
				// works inside the panel, so the trail back to the menu it came from
				// reads as live.
				data-open={dataAttr(open)}
				className={cn('group/option', k.item({ density: space, size }), k.subTrigger, className)}
				{...getReferenceProps({
					onPointerMove: handlePointerMove,
					onBlur: handleBlur,
					onKeyDown: handleTriggerKeyDown,
					// Opens rather than toggles: a click landing on a row the pointer has
					// already hovered open would otherwise shut the submenu the user is
					// reaching for.
					onClick: () => {
						if (!disabled) openWithFocus()
					},
				})}
			>
				{icon ? <Icon icon={icon} /> : null}

				<MenuLabel>{label}</MenuLabel>

				<Icon icon={<ChevronRight />} className="ml-auto" />
			</button>

			{/* The level this row's own panel opens, wrapping the surface rather than
			sitting inside it so it outlives each open — its rows rove by real focus,
			whatever model the menu above them uses. */}
			<MenuPointerLevel>
				<FloatingSurface
					open={open}
					setFloating={setPanel}
					floatingStyles={floatingStyles}
					getFloatingProps={getFloatingProps}
				>
					<PopoverPanel
						id={panelId}
						role="menu"
						aria-labelledby={triggerId}
						itemSelector={MENUITEM_SELECTOR}
						// Hover opens the panel without moving focus; the keyboard and click
						// paths seat it on the first row themselves (see `seatFocus`).
						autoFocus={false}
						// Tab cycles the submenu's own rows; the parent menu is reached back
						// through ArrowLeft or `Escape`, not by tabbing past the last row.
						trapTab
						typeahead
						glass={glass}
						// `relative` puts the panel back in flow (its recipe base is
						// `absolute`) so the positioning wrapper shrink-wraps to it. Without
						// it the wrapper measures 0×0 and the engine has no width to place
						// against — a left-side placement would land on top of the parent
						// menu. {@link MenuContent} does the same for its floating panel.
						className={cn('relative', k.content)}
						onKeyDown={handlePanelKeyDown}
					>
						<div
							ref={setRowContainer}
							data-slot="menu-viewport"
							className={k.viewport({ density: space, capped })}
						>
							{children}
						</div>
					</PopoverPanel>
				</FloatingSurface>
			</MenuPointerLevel>
		</>
	)
}
