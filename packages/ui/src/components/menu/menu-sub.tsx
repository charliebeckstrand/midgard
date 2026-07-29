'use client'

import { ChevronRight } from 'lucide-react'
import {
	type KeyboardEvent,
	type PointerEvent,
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
import { useDensity } from '../../primitives/density'
import { FloatingSurface } from '../../primitives/floating-surface'
import { PopoverPanel } from '../../primitives/popover'
import { useGlass } from '../../providers/glass/context'
import { k } from '../../recipes/kata/menu'
import { Icon } from '../icon'
import { MenuLabel } from './slots'
import { MENUITEM_SELECTOR } from './use-menu-state'

/**
 * Grace period (ms) between the pointer leaving the trigger or the panel and
 * the submenu closing, so a diagonal sweep from the trigger to a row inside the
 * panel — which passes over the gap, and over the rows above or below — doesn't
 * shut it mid-travel.
 *
 * @internal
 */
const CLOSE_DELAY = 120

/** Keys that open a submenu from its trigger: the APG submenu key plus the activation pair. @internal */
const OPEN_KEYS = ['ArrowRight', 'Enter', ' ']

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
 * panel its rows render in. Opens on hover, on click, and on ArrowRight / Enter
 * / Space; closes on ArrowLeft, `Escape`, an outside press, or the pointer
 * leaving both surfaces. Selecting a row inside closes the whole menu, as any
 * {@link MenuItem} does.
 *
 * @remarks Hover never moves focus — only a keyboard or click open seats it on
 * the first row (APG). The panel portals out of the enclosing {@link MenuContent},
 * so its height-capped, scrolling viewport can't clip it.
 * @see {@link MenuItem}
 */
export function MenuSub({ label, icon, disabled = false, className, children }: MenuSubProps) {
	const { space, size } = useDensity()

	const glass = useGlass()

	const [open, setOpen] = useState(false)

	const triggerRef = useRef<HTMLButtonElement>(null)

	// Whether the pending open should pull focus into the panel: set by the
	// keyboard and click paths, left clear by hover so a pointer sweep across the
	// menu doesn't yank focus off whatever the user is on.
	const seatFocus = useRef(false)

	const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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
		// Beside the parent row, top-aligned with it; `flip` sends it to the other
		// side when the viewport edge is closer than the panel is wide.
		placement: 'right-start',
		open,
		onOpenChange: setOpen,
		// The trigger (`role="menuitem"` + `aria-haspopup`) and the panel
		// (`role="menu"`) carry their own roles; a role here would stamp the
		// positioning wrapper with a duplicate.
		role: null,
		returnFocusTo: triggerRef,
	})

	const cancelClose = useCallback(() => {
		if (closeTimer.current === null) return

		clearTimeout(closeTimer.current)

		closeTimer.current = null
	}, [])

	const scheduleClose = useCallback(() => {
		cancelClose()

		closeTimer.current = setTimeout(() => {
			closeTimer.current = null

			setOpen(false)
		}, CLOSE_DELAY)
	}, [cancelClose])

	// A close scheduled as the menu unmounts (the parent menu closing under the
	// pointer) would otherwise fire into a torn-down component.
	useEffect(() => cancelClose, [cancelClose])

	// Seat focus on the first row of a keyboard- or click-opened submenu, once the
	// panel's rows are in the DOM.
	useEffect(() => {
		if (!open || !rows || !seatFocus.current) return

		seatFocus.current = false

		rows.querySelector<HTMLElement>(MENUITEM_SELECTOR)?.focus()
	}, [open, rows])

	const openWithFocus = useCallback(() => {
		cancelClose()

		seatFocus.current = true

		setOpen(true)
	}, [cancelClose])

	const setTrigger = useCallback(
		(node: HTMLButtonElement | null) => {
			triggerRef.current = node

			refs.setReference(node)
		},
		[refs],
	)

	const handleTriggerKeyDown = useCallback(
		(event: KeyboardEvent<HTMLButtonElement>) => {
			if (disabled) return

			if (OPEN_KEYS.includes(event.key)) {
				event.preventDefault()

				openWithFocus()

				return
			}

			// ArrowLeft from the trigger of an open submenu collapses it, the mirror
			// of the ArrowRight that opened it.
			if (event.key === 'ArrowLeft' && open) {
				event.preventDefault()

				cancelClose()

				setOpen(false)
			}
		},
		[disabled, open, openWithFocus, cancelClose],
	)

	const handlePanelKeyDown = useCallback(
		(event: KeyboardEvent) => {
			if (event.key !== 'ArrowLeft') return

			event.preventDefault()

			cancelClose()

			setOpen(false)

			triggerRef.current?.focus()
		},
		[cancelClose],
	)

	const handlePointerEnter = useCallback(
		(event: PointerEvent) => {
			if (disabled) return

			// Touch has no hover to express intent with: a tap fires `click`, which
			// opens the submenu there.
			if (event.pointerType === 'touch') return

			cancelClose()

			setOpen(true)
		},
		[disabled, cancelClose],
	)

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
					onPointerEnter: handlePointerEnter,
					onPointerLeave: scheduleClose,
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

			<FloatingSurface
				open={open}
				setFloating={refs.setFloating}
				floatingStyles={floatingStyles}
				getFloatingProps={getFloatingProps}
				onPointerEnter={cancelClose}
				onPointerLeave={scheduleClose}
			>
				<PopoverPanel
					id={panelId}
					role="menu"
					aria-labelledby={triggerId}
					itemSelector={MENUITEM_SELECTOR}
					// Hover opens the panel without moving focus; the keyboard and click
					// paths seat it on the first row themselves (see `seatFocus`).
					autoFocus={false}
					typeahead
					glass={glass}
					className={k.content}
					onKeyDown={handlePanelKeyDown}
				>
					<div
						ref={setRowContainer}
						data-slot="menu-viewport"
						className={k.viewport({ density: space })}
					>
						{children}
					</div>
				</PopoverPanel>
			</FloatingSurface>
		</>
	)
}
