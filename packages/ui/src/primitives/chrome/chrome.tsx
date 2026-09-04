'use client'

import { type HTMLAttributes, type ReactNode, useEffect, useRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/chrome'
import { registerChrome } from './chrome-registry'

/** Props for {@link PersistentChrome}: the region's `children`, plus any div attributes. */
export type PersistentChromeProps = HTMLAttributes<HTMLDivElement> & { children: ReactNode }

/**
 * Marks a region as application chrome that a modal surface must not seal off.
 *
 * A modal surface seals the page behind it, which fits a transaction the user
 * opens to complete. It does not fit a long-lived work surface inside
 * persistent chrome — a maximized drawer whose state lives in a tab's href —
 * because the trap makes the tab strip that raised the surface unreachable,
 * and the only exit left is to dismantle the work (WCAG 2.1.1 / 2.4.3).
 *
 * Wrap that chrome here and every modal surface in the app keeps it in the
 * focus order, in the accessibility tree, and clickable. The rest of the page
 * stays sealed, and no surface needs to know this region exists.
 *
 * @remarks Modality holds. Focus still moves into a panel on open and returns
 * on close, the body stays scroll-locked, and the scrim still dismisses on a
 * press. Only the enforcement changes: sealed content becomes `inert` rather
 * than `aria-hidden`, so it also loses its pointer events, and the tab order
 * runs in DOM order out of the panel, through this region, and back — what a
 * native `<dialog>` does. A browser with no `inert` support keeps the strict
 * trap; there, only the accessibility-tree and pointer exemptions apply.
 *
 * Register every region that must stay live, such as a toast viewport holding
 * `role="alert"` toasts. Regions are read when a surface marks the page, so
 * chrome that mounts after a surface is already up is not exempt from it.
 *
 * The region paints above modal surfaces and below floats and toasts. It
 * positions itself so that rung binds; a `className` that positions it
 * differently (`sticky`, `fixed`) wins.
 *
 * @example
 * ```tsx
 * <PersistentChrome className="sticky top-0">
 * 	<TabStrip />
 * </PersistentChrome>
 * ```
 */
export function PersistentChrome({ className, children, ...props }: PersistentChromeProps) {
	const ref = useRef<HTMLDivElement>(null)

	useEffect(() => (ref.current ? registerChrome(ref.current) : undefined), [])

	return (
		<div ref={ref} data-slot="persistent-chrome" className={cn(k.region, className)} {...props}>
			{children}
		</div>
	)
}
