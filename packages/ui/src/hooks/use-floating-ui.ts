'use client'

import {
	autoUpdate,
	type ExtendedRefs,
	type FloatingRootContext,
	flip,
	type Middleware,
	type OpenChangeReason,
	offset,
	type Placement,
	type ReferenceType,
	shift,
	size,
	useDismiss,
	useFloating,
	useInteractions,
	useRole,
} from '@floating-ui/react'
import {
	type CSSProperties,
	type HTMLProps,
	type RefObject,
	useEffect,
	useMemo,
	useRef,
} from 'react'
import { subscribeDocumentEvent } from '../utilities/document-listener'

// Explicit return types: `useFloating`'s shape references `@floating-ui/react-dom`,
// a transitive dep that TS can't express in a portable `.d.ts` (TS2742).
// Kept local — not re-exported from the barrel.
type FloatingPanelResult = {
	refs: ExtendedRefs<ReferenceType>
	floatingStyles: CSSProperties
	context: FloatingRootContext
}

type FloatingUIResult = FloatingPanelResult & {
	getReferenceProps: (userProps?: HTMLProps<Element>) => Record<string, unknown>
	getFloatingProps: (userProps?: HTMLProps<HTMLElement>) => Record<string, unknown>
}

const matchReferenceWidthMiddleware = size({
	apply({ rects, elements }) {
		Object.assign(elements.floating.style, {
			minWidth: `${rects.reference.width}px`,
		})
	},
})

function buildMiddleware(offsetPx: number, matchReferenceWidth: boolean): Middleware[] {
	const middleware: Middleware[] = [offset(offsetPx), flip(), shift({ padding: 8 })]

	if (matchReferenceWidth) middleware.push(matchReferenceWidthMiddleware)

	return middleware
}

const SCROLLABLE_RE = /auto|scroll/

function isScrollbarPress(event: PointerEvent, target: HTMLElement): boolean {
	const style = getComputedStyle(target)

	const scrollableX = SCROLLABLE_RE.test(style.overflowX)
	const scrollableY = SCROLLABLE_RE.test(style.overflowY)

	const canScrollX =
		scrollableX && target.clientWidth > 0 && target.scrollWidth > target.clientWidth
	const canScrollY =
		scrollableY && target.clientHeight > 0 && target.scrollHeight > target.clientHeight

	const onVerticalScrollbar =
		canScrollY &&
		(style.direction === 'rtl'
			? event.offsetX <= target.offsetWidth - target.clientWidth
			: event.offsetX > target.clientWidth)
	const onHorizontalScrollbar = canScrollX && event.offsetY > target.clientHeight

	return onVerticalScrollbar || onHorizontalScrollbar
}

export type FloatingPanelOptions = {
	placement: Placement
	open: boolean
	onOpenChange: (open: boolean, event?: Event, reason?: OpenChangeReason) => void
	/** Offset (px) between reference and floating element. @default 4 */
	offset?: number
	/** When true, adds a size middleware that sets the floating element's min-width to the reference width. @default false */
	matchReferenceWidth?: boolean
	/** Escape hatch — fully overrides the default offset/flip/shift/size middleware chain. */
	middleware?: Middleware[]
	/** When the panel transitions from open to closed, return focus to this element. */
	returnFocusTo?: RefObject<HTMLElement | null>
}

/**
 * Base hook for floating panels: wires `useFloating` with `autoUpdate` and a
 * standardized middleware chain (offset/flip/shift, optional size).
 *
 * Use this when you need to compose your own interaction hooks (hover, click,
 * clientPoint, etc.) against the returned `context`. For the common
 * dismiss+role pattern, prefer `useFloatingUI`.
 */
export function useFloatingPanel({
	placement,
	open,
	onOpenChange,
	offset: offsetPx = 4,
	matchReferenceWidth = false,
	middleware,
	returnFocusTo,
}: FloatingPanelOptions): FloatingPanelResult {
	const resolvedMiddleware = useMemo(
		() => middleware ?? buildMiddleware(offsetPx, matchReferenceWidth),
		[middleware, offsetPx, matchReferenceWidth],
	)

	const { refs, floatingStyles, context } = useFloating({
		placement,
		open,
		onOpenChange,
		whileElementsMounted: autoUpdate,
		middleware: resolvedMiddleware,
	})

	const prevOpenRef = useRef(open)

	useEffect(() => {
		if (prevOpenRef.current && !open) returnFocusTo?.current?.focus()

		prevOpenRef.current = open
	}, [open, returnFocusTo])

	return { refs, floatingStyles, context }
}

type FloatingUIOptions = FloatingPanelOptions & {
	/**
	 * Popup role floating-ui stamps on the floating element, plus the matching
	 * `aria-haspopup`/`aria-controls`/`aria-expanded` on the reference. Pass
	 * `null` when the component hand-rolls its own roles on inner elements (the
	 * trigger button and the panel) so floating-ui doesn't double-stamp the
	 * positioning wrapper — which otherwise nests a duplicate widget around the
	 * real one (combobox-in-combobox, listbox-in-listbox). @default 'listbox'
	 */
	role?: 'listbox' | 'menu' | 'dialog' | 'tooltip' | null
}

/**
 * Floating panel with built-in dismiss and role interactions — the common
 * pattern for listbox, combobox, dropdown menu, and date picker surfaces.
 *
 * Outside-press uses a custom document-level pointerdown listener that checks
 * the press target directly against the floating panel and reference, with no
 * false positives from sibling portals inside a `Sheet`/`Dialog`.
 */
export function useFloatingUI({
	role: roleProp = 'listbox',
	...rest
}: FloatingUIOptions): FloatingUIResult {
	const { refs, floatingStyles, context } = useFloatingPanel(rest)

	const dismiss = useDismiss(context, { outsidePress: false })

	// `enabled: false` keeps the Hook call unconditional (rules of hooks) while
	// emitting no role/aria props — a component owning its roles is not
	// double-stamped on the positioning wrapper.
	const role = useRole(context, { role: roleProp ?? 'listbox', enabled: roleProp !== null })

	const { getReferenceProps, getFloatingProps } = useInteractions([dismiss, role])

	const { open, onOpenChange } = rest

	const onOpenChangeRef = useRef(onOpenChange)

	onOpenChangeRef.current = onOpenChange

	useEffect(() => {
		if (!open) return

		const onPointerDown = (event: PointerEvent) => {
			const target = event.target

			if (!(target instanceof Node)) return

			const floating = refs.floating.current

			// Skip while the panel hasn't mounted — nothing to compare against.
			if (!floating) return

			if (floating.contains(target)) return
			if (refs.domReference.current?.contains(target)) return
			if (target instanceof HTMLElement && isScrollbarPress(event, target)) return

			onOpenChangeRef.current(false, event, 'outside-press')
		}

		return subscribeDocumentEvent('pointerdown', onPointerDown)
	}, [open, refs])

	return { refs, floatingStyles, context, getReferenceProps, getFloatingProps }
}
