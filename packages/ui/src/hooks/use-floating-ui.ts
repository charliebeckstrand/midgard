import {
	autoUpdate,
	type ExtendedRefs,
	type FloatingRootContext,
	flip,
	type Middleware,
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
import { type CSSProperties, type HTMLProps, useMemo } from 'react'

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

export type UseFloatingPanelOptions = {
	placement: Placement
	open: boolean
	onOpenChange: (open: boolean) => void
	/** Offset (px) between reference and floating element. @default 4 */
	offset?: number
	/** When true, adds a size middleware that sets the floating element's min-width to the reference width. @default false */
	matchReferenceWidth?: boolean
	/** Escape hatch — fully overrides the default offset/flip/shift/size middleware chain. */
	middleware?: Middleware[]
}

export type UseFloatingPanelReturn = {
	refs: ExtendedRefs<ReferenceType>
	floatingStyles: CSSProperties
	context: FloatingRootContext
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
}: UseFloatingPanelOptions): UseFloatingPanelReturn {
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

	return { refs, floatingStyles, context }
}

export type UseFloatingUIOptions = UseFloatingPanelOptions & {
	role?: 'listbox' | 'menu' | 'dialog' | 'tooltip'
}

export type UseFloatingUIReturn = UseFloatingPanelReturn & {
	getReferenceProps: (userProps?: HTMLProps<Element>) => Record<string, unknown>
	getFloatingProps: (userProps?: HTMLProps<HTMLElement>) => Record<string, unknown>
}

/**
 * Floating panel with built-in dismiss and role interactions — the common
 * pattern for listbox, combobox, dropdown menu, and date picker surfaces.
 */
export function useFloatingUI({
	role: roleProp = 'listbox',
	...rest
}: UseFloatingUIOptions): UseFloatingUIReturn {
	const { refs, floatingStyles, context } = useFloatingPanel(rest)

	const dismiss = useDismiss(context)

	const role = useRole(context, { role: roleProp })

	const { getReferenceProps, getFloatingProps } = useInteractions([dismiss, role])

	return { refs, floatingStyles, context, getReferenceProps, getFloatingProps }
}
