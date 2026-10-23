'use client'

import { useCallback, useMemo, useState } from 'react'
import { adaptive, type Responsive, withInitial } from '../types/responsive'
import { useReportedChange } from './use-reported-change'
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
 * @param options - `layout`, the layout at each breakpoint, and `onOpenChange`,
 * reported on every transition of the open flag.
 * @remarks The hook reads `layout` with `useResponsiveValue`, which reads the
 * same breakpoints as the classes of a responsive axis. While the
 * layout is `inline`, the drawer stays closed, and a `setOpen(true)` has no
 * effect. A map that names no `initial` value takes `drawer` there.
 * @returns `{ open, setOpen, close, layout }`: the open flag, its setter, a
 * memoized `close` convenience, and the layout with its `initial` value. Give
 * that layout to the `layout` axis of the offcanvas kata, so that the CSS
 * agrees with the open flag.
 */
export function useOffcanvas({ layout = OFFCANVAS_LAYOUT, onOpenChange }: OffcanvasOptions = {}) {
	const [choice, setOpen] = useState(false)

	// The same object while `layout` keeps its identity, so a memo that reads it holds.
	const filled = useMemo(() => withInitial(layout, 'drawer'), [layout])

	const inline = useResponsiveValue(filled, 'drawer') === 'inline'

	// The drawer root keeps the choice while the layout is inline. If the choice
	// stays true, the drawer opens again without a press when the viewport
	// narrows. Thus the choice resets during the render that reaches the inline
	// layout.
	if (inline && choice) setOpen(false)

	const open = choice && !inline

	const close = useCallback(() => setOpen(false), [])

	// Watched rather than wrapped around the setter: the auto-close above has no
	// call site of its own, and `setOpen` is handed out raw for callers to drive.
	useReportedChange(open, onOpenChange)

	return { open, setOpen, close, layout: filled }
}
