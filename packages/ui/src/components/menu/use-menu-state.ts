'use client'

import { useClick, useInteractions } from '@floating-ui/react'
import {
	type KeyboardEvent,
	type MouseEvent,
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from 'react'
import type { ScaleStep } from '../../core/density'
import { type FloatingPlacement, useFloatingDisclosure, useMediaQuery } from '../../hooks'
import { clearVirtualActive, useA11yRoving } from '../../hooks/a11y/use-a11y-roving'
import type { scale } from '../../recipes/kata/menu'
import { BREAKPOINT_WIDTHS } from '../../types/responsive'
import { isNativeContextMenuRequest, NO_HOVER_QUERY } from '../../utilities'
import { snapMenuHeight } from './menu-viewport-utilities'

/** Navigable menu items: `role="menuitem"`, excluding disabled rows. @internal */
export const MENUITEM_SELECTOR = '[role="menuitem"]:not([data-disabled])'

/**
 * Keys that activate the active menu item. Space joins Enter (APG menu pattern):
 * the trigger is a button, not a text input, so Space selects rather than types.
 * Module-level for a stable reference so the roving handler stays memoized.
 * @internal
 */
const MENU_ACTIVATION_KEYS = ['Enter', ' '] as const

/**
 * A phone: no hover, and a viewport narrower than the `sm` breakpoint. A narrow
 * desktop window keeps the popover, because a pointer places it well. The query
 * asks for the phone, so an environment that matches nothing gets the popover.
 * @internal
 */
const PHONE_QUERY = `${NO_HOVER_QUERY} and (width < ${BREAKPOINT_WIDTHS.sm})`

type MenuStateOptions = {
	open?: boolean
	defaultOpen?: boolean
	onOpenChange?: (open: boolean) => void
	placement?: FloatingPlacement
	size?: ScaleStep<typeof scale>
	sheet?: boolean
	disabled?: boolean
}

/**
 * A position-only virtual reference for a right-click menu: a zero-size point at
 * the cursor that rides `element` as it scrolls. `contextElement` ties it to the
 * right-clicked element, so `autoUpdate` tracks that element's scroll container.
 * The cursor offset captured on the first read holds the menu at the same
 * spot within it. Set via `setPositionReference`, never `setReference`, so the
 * element is not floating-ui's dismissal reference. A press on it dismisses the
 * menu like any other outside press. Falls back to a fixed viewport point when
 * the right-click resolves to no element.
 *
 * @internal
 */
function cursorAnchor(element: Element | null, clientX: number, clientY: number) {
	let offsetX: number | null = null
	let offsetY: number | null = null

	return {
		contextElement: element ?? undefined,
		getBoundingClientRect() {
			const rect = element?.getBoundingClientRect()

			const baseX = rect?.x ?? clientX
			const baseY = rect?.y ?? clientY

			// Capture the cursor's offset within the element on the first read, then
			// subtract it on every tick so the point rides the element as it scrolls.
			offsetX ??= baseX - clientX
			offsetY ??= baseY - clientY

			const x = baseX - offsetX
			const y = baseY - offsetY

			return { width: 0, height: 0, x, y, top: y, right: x, bottom: y, left: x }
		},
	}
}

/**
 * Whether a keydown is the keyboard request for a context menu: the ContextMenu
 * key, or Shift+F10. The browser then fires `contextmenu` at the focused element.
 *
 * @internal
 */
function isContextMenuKey(event: KeyboardEvent): boolean {
	return event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey)
}

/**
 * Disclosure, positioning, and density state for {@link Menu}, split into a
 * `state`/`actions` pair plus the handlers of the context surface and an
 * `isContextSurface` flag. The right-click `handleContextMenu` opens the menu. The
 * `handleContextKeyDown` and `handleContextPointerDown` captures tell a keyboard
 * open from a pointer open, and only a keyboard open restores focus on close.
 * Drives all three menu modes. A `placement` gives the dropdown. A
 * `defaultOpen` with no `placement` gives the static inline menu. Neither one
 * gives the right-click context menu, a position-only {@link cursorAnchor}
 * that opens at the cursor yet tracks the right-clicked element on scroll.
 *
 * @internal
 * @see {@link useFloatingDisclosure}
 */
export function useMenuState({
	open: openProp,
	defaultOpen = false,
	onOpenChange,
	placement,
	size,
	sheet = true,
	disabled = false,
}: MenuStateOptions) {
	const isDropdown = placement !== undefined

	const phone = useMediaQuery(PHONE_QUERY)

	const isSheet = isDropdown && sheet && phone

	const isStatic = defaultOpen && !isDropdown

	// Only a true right-click context menu wires `onContextMenu`. A static menu is
	// also `!isDropdown`, but suppressing its native context menu (via
	// `handleContextMenu`'s preventDefault) buys nothing — its panel is already open.
	const isContextMenu = !isDropdown && !isStatic

	// A disabled context menu keeps its wrapper, so the content under it keeps its
	// state. It wires no surface and does not open, so the native menu of the
	// browser opens. A dropdown and a static menu ignore the flag.
	const suppressed = isContextMenu && disabled

	// The trigger (`aria-haspopup="menu"`) and the panel (`role="menu"`) carry
	// their own roles; `role: null` suppresses floating-ui's `useRole`, which
	// double-stamps the positioning wrapper. `menuId` wires the trigger's
	// `aria-controls` to the real menu panel.
	const menuId = useId()

	const { open, setOpen, close, triggerRef, refs, floatingStyles, context, dismiss, role } =
		useFloatingDisclosure({
			open: openProp,
			defaultOpen,
			onOpenChange,
			role: null,
			placement: placement ?? 'bottom-start',
			matchReferenceWidth: isDropdown,
			// A menu taller than the space on its side of the trigger shrinks into
			// that space and scrolls, instead of running off the screen. The cut
			// falls at the middle of a row, so the clipped row shows the overflow.
			fitHeight: snapMenuHeight,
			// A static menu renders inline and stays visible — `MenuContent` gates
			// the panel on `isStatic`, not on `open`. Left dismissable it would take
			// a slot on the shared Escape stack, report a close that changes nothing,
			// and swallow the press meant for an enclosing Dialog.
			dismissable: !isStatic,
			gate: (next) => !next || !suppressed,
		})

	// Adjusted during render, as a tooltip does: a context menu that turns off
	// while open closes in the same render. Thus it does not open again when it
	// turns back on.
	const [wasSuppressed, setWasSuppressed] = useState(suppressed)

	if (wasSuppressed !== suppressed) {
		setWasSuppressed(suppressed)

		if (suppressed && open) setOpen(false)
	}

	// Tab off the trigger closes the menu (focus stays on the trigger while it is
	// open). Routing through `context.onOpenChange` with `'focus-out'` records the
	// reason so the disclosure's focus-return effect leaves focus where the Tab is
	// carrying it — forward to the next tabbable, back with Shift+Tab — instead of
	// snapping it back to the trigger and swallowing the keystroke.
	//
	// The handler, not `context`: floating-ui rebuilds the context
	// object on every reposition, and this callback feeds the `actions` memo that
	// backs `MenuActionsContext`. Depending on the whole object would therefore
	// re-identify that context on each `autoUpdate` tick and re-render every
	// `MenuItem` under it. The handler itself holds one identity for the mount
	// (see {@link useFloatingOutsidePress}), so naming it alone is safe.
	const { onOpenChange: changeOpen } = context

	const dismissToTab = useCallback(
		(event: Event) => changeOpen(false, event, 'focus-out'),
		[changeOpen],
	)

	// A dropdown keeps focus on its trigger, so its items rove by
	// `aria-activedescendant`, not real focus: arrow / Home / End / type-ahead move
	// a `data-active` cursor over the panel's items (`refs.floating` holds them) and
	// point the trigger's `aria-activedescendant` at the active row; Enter clicks it.
	// `manageAriaSelected: false` — `aria-selected` is not a `menuitem` state. The
	// handler is spread onto the trigger (below); it no-ops while the panel is
	// unmounted, so a closed menu ignores arrows.
	const rovingKeyDown = useA11yRoving(refs.floating, {
		mode: 'virtual',
		itemSelector: MENUITEM_SELECTOR,
		activeDescendantRef: triggerRef,
		typeahead: true,
		activationKey: MENU_ACTIVATION_KEYS,
		manageAriaSelected: false,
	})

	// Clear the trigger's `aria-activedescendant` once closed: the panel (and the
	// ids it pointed at) unmounts, so the attribute would otherwise dangle, and the
	// next open must start with no active row (the first arrow picks the first item).
	//
	// A context menu has no trigger. `openAt` lends `triggerRef` the element that
	// held focus at a keyboard open, and the focus restore of the disclosure reads
	// it in an earlier effect. Release it here, and do not touch its own
	// `aria-activedescendant`: the grid keeps its cursor in that attribute.
	useEffect(() => {
		if (open) return

		if (isContextMenu) triggerRef.current = null
		else clearVirtualActive(triggerRef)
	}, [open, isContextMenu, triggerRef])

	// Toggling the menu is floating-ui's, not the trigger's: `useClick` supplies
	// the keyboard activation a cloned non-button child never gets from the
	// browser, plus the main-button guard and `stickIfOpen`. `MenuTrigger` keeps
	// its own auto-repeat guard, which `useClick` has no equivalent for.
	const click = useClick(context)

	const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role])

	// The element that held focus at the last context-menu key on the surface. A
	// keyboard open restores focus to it on close, as the grid does. A pointer
	// open restores nothing, so focus stays where the user put it.
	const keyboardOpener = useRef<HTMLElement | null>(null)

	// Anchor the menu at a point while tracking `element` as it (or a scroll
	// container) scrolls — but as the *position* reference only, never floating-ui's
	// `reference`. Registering the element as the reference (`setReference`, the
	// `useClientPoint` route) would exempt it from outside-press dismissal, so a
	// left-click on the very element the menu was opened from could not close it; a
	// position-only anchor keeps it a normal outside-press target.
	//
	// Each open also sets the focus restore target. A context menu has no trigger,
	// so `triggerRef` holds the keyboard opener, or null after a pointer open.
	const openAt = useCallback(
		(element: Element | null, clientX: number, clientY: number) => {
			refs.setPositionReference(cursorAnchor(element, clientX, clientY))

			if (isContextMenu) triggerRef.current = keyboardOpener.current

			keyboardOpener.current = null

			setOpen(true)
		},
		[setOpen, refs, isContextMenu, triggerRef],
	)

	const handleContextMenu = useCallback(
		(event: MouseEvent) => {
			// Ctrl + secondary-button click yields to the browser's native menu; bail
			// before `preventDefault` (below) so it is not suppressed. Shared with the
			// grid's own delegation surface via {@link isNativeContextMenuRequest}.
			if (isNativeContextMenuRequest(event)) return

			event.preventDefault()

			// The menu panel is portaled out of the DOM but stays a React child of
			// this wrapper, so its own contextmenu events bubble back here. A
			// right-click inside the open panel must not re-anchor or reposition it:
			// anchoring to an element within the floating panel would make the menu
			// chase its own moving rect, jittering it across the screen. Suppress
			// the native menu (above) and leave the panel where it is.
			if (refs.floating.current?.contains(event.target as Node)) return

			openAt(event.target instanceof Element ? event.target : null, event.clientX, event.clientY)
		},
		[openAt, refs],
	)

	// The surface takes the keydown in the capture phase, so a handler below it
	// cannot stop the key first. A context-menu key records the focused element
	// for `openAt`, and every other key clears the record.
	const handleContextKeyDown = useCallback((event: KeyboardEvent) => {
		keyboardOpener.current =
			isContextMenuKey(event) && event.target instanceof HTMLElement ? event.target : null
	}, [])

	// A pointer press comes before each pointer `contextmenu` event. It clears the
	// record of a key that opened no menu, so the pointer open does not restore.
	const handleContextPointerDown = useCallback(() => {
		keyboardOpener.current = null
	}, [])

	const state = useMemo(
		() => ({
			open,
			menuId,
			isDropdown,
			isSheet,
			floatingStyles,
			getReferenceProps,
			getFloatingProps,
			size,
		}),
		[open, menuId, isDropdown, isSheet, floatingStyles, getReferenceProps, getFloatingProps, size],
	)

	const actions = useMemo(
		() => ({
			setOpen,
			close,
			dismissToTab,
			rovingKeyDown,
			static: isStatic,
			triggerRef,
			setReference: refs.setReference,
			setFloating: refs.setFloating,
			openAt,
		}),
		[
			setOpen,
			close,
			dismissToTab,
			rovingKeyDown,
			isStatic,
			triggerRef,
			refs.setReference,
			refs.setFloating,
			openAt,
		],
	)

	return {
		state,
		actions,
		handleContextMenu,
		handleContextKeyDown,
		handleContextPointerDown,
		isContextSurface: isContextMenu && !suppressed,
	}
}
