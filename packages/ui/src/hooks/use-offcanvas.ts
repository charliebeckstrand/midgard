'use client'

import { useCallback, useState } from 'react'
import { adaptive, type Responsive } from '../types/responsive'
import { useOpenChange } from './use-open-change'
import { useResponsiveValue } from './use-responsive-value'

/**
 * Where an offcanvas layout puts its panel: in a `drawer` that a trigger
 * opens, or `inline` beside the content.
 */
export type OffcanvasLayout = 'drawer' | 'inline'

/**
 * The default layout of an offcanvas panel: a drawer on a compact or a medium
 * viewport, and inline when expanded.
 */
export const OFFCANVAS_LAYOUT = adaptive({
	compact: 'drawer',
	expanded: 'inline',
}) satisfies Responsive<OffcanvasLayout>

/** Options for {@link useOffcanvas}: the layout of the panel, and the open-state binding the panel reads. */
export type OffcanvasOptions = {
	/**
	 * Where the panel is at each breakpoint. The drawer closes while the layout
	 * is `inline`. Pass the `layout` of the component that uses the hook, so that
	 * the hook and the classes of the component agree.
	 * @defaultValue {@link OFFCANVAS_LAYOUT}
	 */
	layout?: Responsive<OffcanvasLayout>
	/**
	 * Fires when the panel opens or closes, whatever drove it: a trigger, a dismissal,
	 * `close`, or the viewport widening to an `inline` layout.
	 */
	onOpenChange?: (open: boolean) => void
}

/**
 * Manages offcanvas sidebar state: open/close plus auto-close
 * when the viewport widens to an `inline` layout.
 *
 * @param options `layout`, the layout at each breakpoint, and `onOpenChange`,
 * reported on every transition of the open flag.
 * @remarks The hook reads `layout` with `useResponsiveValue`, which reads the
 * same breakpoints as the classes that `resolveVariant` gives for it. While the
 * layout is `inline`, the drawer stays closed, and a `setOpen(true)` has no
 * effect.
 * @returns `{ open, setOpen, close }` — the open flag, its setter, and a
 * memoized `close` convenience.
 */
export function useOffcanvas({ layout = OFFCANVAS_LAYOUT, onOpenChange }: OffcanvasOptions = {}) {
	const [choice, setOpen] = useState(false)

	const inline = useResponsiveValue(layout, 'drawer') === 'inline'

	// The drawer root keeps the choice while the layout is inline. If the choice
	// stays true, the drawer opens again without a press when the viewport
	// narrows. Thus the choice resets during the render that reaches the inline
	// layout.
	if (inline && choice) setOpen(false)

	const open = choice && !inline

	const close = useCallback(() => setOpen(false), [])

	// Watched rather than wrapped around the setter: the auto-close above has no
	// call site of its own, and `setOpen` is handed out raw for callers to drive.
	useOpenChange(open, onOpenChange)

	return { open, setOpen, close }
}
