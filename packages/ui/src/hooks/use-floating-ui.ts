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
	useCallback,
	useEffect,
	useMemo,
	useRef,
} from 'react'
import { subscribeDocumentEvent } from '../utilities/document-listener'
import { useEscapeLayer } from './use-escape-layer'

/**
 * Explicit return shape for {@link useFloatingPanel}.
 *
 * @remarks `useFloating`'s inferred shape references `@floating-ui/react-dom`,
 * a transitive dep TS can't express in a portable `.d.ts` (TS2742); declaring
 * it locally avoids the error. The barrel does not re-export it.
 * @internal
 */
type FloatingPanelResult = {
	refs: ExtendedRefs<ReferenceType>
	floatingStyles: CSSProperties
	context: FloatingRootContext
}

type FloatingUIResult = FloatingPanelResult & {
	getReferenceProps: (userProps?: HTMLProps<Element>) => Record<string, unknown>
	getFloatingProps: (userProps?: HTMLProps<HTMLElement>) => Record<string, unknown>
}

/** Sizes the floating element's min-width to the reference width. @internal */
const matchReferenceWidthMiddleware = size({
	apply({ rects, elements }) {
		Object.assign(elements.floating.style, {
			minWidth: `${rects.reference.width}px`,
		})
	},
})

/** Default middleware chain: offset / flip / shift, plus the match-reference-width size middleware when requested. @internal */
function buildMiddleware(offsetPx: number, matchReferenceWidth: boolean): Middleware[] {
	const middleware: Middleware[] = [offset(offsetPx), flip(), shift({ padding: 8 })]

	if (matchReferenceWidth) middleware.push(matchReferenceWidthMiddleware)

	return middleware
}

const SCROLLABLE_RE = /auto|scroll/

/** True when a pointerdown landed on `target`'s own scrollbar gutter; such presses don't dismiss the panel. @internal */
function isScrollbarPress(event: PointerEvent, target: HTMLElement): boolean {
	const style = getComputedStyle(target)

	// The root (html/body) scrolls the page even though its computed overflow is
	// `visible`; floating-ui treats the last traversable node as scrollable.
	const isRoot = target === document.documentElement || target === document.body

	const scrollableX = isRoot || SCROLLABLE_RE.test(style.overflowX)
	const scrollableY = isRoot || SCROLLABLE_RE.test(style.overflowY)

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
	/** Offset (px) between reference and floating element. @defaultValue 4 */
	offset?: number
	/** When true, adds a size middleware that sets the floating element's min-width to the reference width. @defaultValue false */
	matchReferenceWidth?: boolean
	/** Escape hatch: fully overrides the default offset/flip/shift/size middleware chain. */
	middleware?: Middleware[]
	/**
	 * When the panel transitions from open to closed, return focus to this
	 * element (or its first `button`/`[tabindex]` descendant when the element
	 * itself is a non-focusable wrapper). An `'outside-press'` close skips the
	 * restore (focus follows the pointer), as does a `'focus-out'` close
	 * (Tab already carried focus to the next tabbable; snapping back would
	 * undo it). Focus already inside the element also skips it: there is
	 * nothing to restore, and snapping to the descendant would yank a caret
	 * (Escape while typing in an input-mode DatePicker's DateInput).
	 */
	returnFocusTo?: RefObject<HTMLElement | null>
}

/**
 * Base hook for floating panels: wires `useFloating` with `autoUpdate` and a
 * standardized middleware chain (offset/flip/shift, optional size).
 *
 * Use this when you need to compose your own interaction hooks (hover, click,
 * clientPoint, etc.) against the returned `context`. For the common
 * dismiss+role pattern, prefer `useFloatingUI`.
 *
 * @returns `{ refs, floatingStyles, context }`: floating-ui's reference /
 * floating refs, the positioning styles for the floating element, and the
 * shared `FloatingRootContext` interaction hooks attach to.
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

	const onOpenChangeRef = useRef(onOpenChange)

	onOpenChangeRef.current = onOpenChange

	// Reason of the pending close request; the focus-return effect reads it.
	// Every close that flows through floating-ui's `context.onOpenChange`
	// (interaction hooks, `FloatingFocusManager`, `useFloatingUI`'s dismiss
	// listeners) records one; programmatic closes carry none.
	const closeReasonRef = useRef<OpenChangeReason | undefined>(undefined)

	const handleOpenChange = useCallback(
		(nextOpen: boolean, event?: Event, reason?: OpenChangeReason) => {
			if (!nextOpen) closeReasonRef.current = reason

			onOpenChangeRef.current(nextOpen, event, reason)
		},
		[],
	)

	const { refs, floatingStyles, context } = useFloating({
		placement,
		open,
		onOpenChange: handleOpenChange,
		whileElementsMounted: autoUpdate,
		middleware: resolvedMiddleware,
	})

	const prevOpenRef = useRef(open)

	useEffect(() => {
		// An outside press skips restoration (focus follows the pointer), as
		// does a focus-out (Tab moved focus to the next tabbable; APG select
		// closes and lets the keystroke proceed). Every other close (Escape,
		// selection, programmatic) restores it.
		const reason = closeReasonRef.current

		if (prevOpenRef.current && !open && reason !== 'outside-press' && reason !== 'focus-out') {
			const trigger = returnFocusTo?.current

			// Focus already within the trigger means there is nothing to restore;
			// retargeting its first button would yank focus from a typeable
			// reference mid-edit.
			if (trigger && !trigger.contains(document.activeElement))
				(trigger.querySelector<HTMLElement>('button, [tabindex]') ?? trigger).focus()
		}

		closeReasonRef.current = undefined

		prevOpenRef.current = open
	}, [open, returnFocusTo])

	return { refs, floatingStyles, context }
}

type FloatingUIOptions = FloatingPanelOptions & {
	/**
	 * Popup role floating-ui stamps on the floating element, plus the matching
	 * `aria-haspopup`/`aria-controls`/`aria-expanded` on the reference. Pass
	 * `null` when the component hand-rolls its own roles on inner elements (the
	 * trigger button and the panel); a role here also stamps the positioning
	 * wrapper, nesting a duplicate widget around the real one
	 * (combobox-in-combobox, listbox-in-listbox). @defaultValue 'listbox'
	 */
	role?: 'listbox' | 'menu' | 'dialog' | 'tooltip' | null
}

/**
 * Floating panel with built-in dismiss and role interactions: the common
 * pattern for listbox, combobox, dropdown menu, and date picker surfaces.
 *
 * Outside-press uses a custom document-level pointerdown listener that checks
 * the press target directly against the floating panel and reference, with no
 * false positives from sibling portals inside a `Sheet`/`Dialog`.
 *
 * @returns `useFloatingPanel`'s `{ refs, floatingStyles, context }` plus
 * `getReferenceProps` / `getFloatingProps` prop-getters that fold in the
 * dismiss + role interactions; spread them on the reference and floating
 * elements respectively.
 */
export function useFloatingUI({
	role: roleProp = 'listbox',
	...rest
}: FloatingUIOptions): FloatingUIResult {
	const { refs, floatingStyles, context } = useFloatingPanel(rest)

	// Escape goes through the shared dismiss-layer stack instead of
	// floating-ui's flat document listener, so a panel inside a Dialog/Sheet
	// consumes the press without also closing the surface beneath.
	const dismiss = useDismiss(context, { outsidePress: false, escapeKey: false })

	// `enabled: false` keeps the Hook call unconditional (rules of hooks) while
	// emitting no role/aria props for a component that owns its roles.
	const role = useRole(context, { role: roleProp ?? 'listbox', enabled: roleProp !== null })

	const { getReferenceProps, getFloatingProps } = useInteractions([dismiss, role])

	const { open } = rest

	// Dismissals route through `context.onOpenChange` rather than the raw
	// prop, so the close reason reaches `useFloatingPanel`'s focus-return
	// effect and floating-ui's own `openchange` listeners.
	const onOpenChangeRef = useRef(context.onOpenChange)

	onOpenChangeRef.current = context.onOpenChange

	useEscapeLayer({
		open,
		onDismiss: (event) => onOpenChangeRef.current(false, event, 'escape-key'),
	})

	useEffect(() => {
		if (!open) return

		const onPointerDown = (event: PointerEvent) => {
			const target = event.target

			if (!(target instanceof Node)) return

			const floating = refs.floating.current

			const insideFloating = !!floating && floating.contains(target)

			const insideReference = !!refs.domReference.current?.contains(target)

			const onScrollbar = target instanceof HTMLElement && isScrollbarPress(event, target)

			if (!floating || insideFloating || insideReference || onScrollbar) return

			onOpenChangeRef.current(false, event, 'outside-press')
		}

		return subscribeDocumentEvent('pointerdown', onPointerDown)
	}, [open, refs])

	return { refs, floatingStyles, context, getReferenceProps, getFloatingProps }
}
