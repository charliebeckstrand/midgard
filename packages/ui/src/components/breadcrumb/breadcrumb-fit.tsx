'use client'

import { useComposedRefs } from 'motion/react'
import {
	type ComponentProps,
	useCallback,
	useEffect,
	useEffectEvent,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from 'react'
import { cn } from '../../core/cn'
import { useIntl } from '../../primitives/intl/use-intl'
import { observeResizeBeforePaint } from '../../utilities/observe-resize-before-paint'
import { breadcrumbFit, breadcrumbFitRule } from './breadcrumb-fit-rule'
import { breadcrumbMessages } from './breadcrumb-messages'

/**
 * The `<nav>` of a collapsing `Breadcrumb`: it measures the row and renders
 * the rule of the fit.
 *
 * @remarks
 * The server cannot know the room of the row. Until the first measure, the
 * server markup and the hydration render thus draw the narrowest trail: every
 * crumb above the current page shows its mark, so the current page paints from
 * the server (CONVENTIONS §3.13). The measure runs in a layout effect, so a
 * row with more room shows its crumbs in the first frame after hydration, and
 * a client render is never painted at the wrong fit. The fit re-measures on
 * resize, after each commit, and once after `document.fonts.ready`: a late
 * font changes what the text takes without changing the box that holds it.
 * @internal
 */
export function BreadcrumbFit({ ref, className, children, ...props }: ComponentProps<'nav'>) {
	const intl = useIntl()

	const id = useId()

	const nav = useRef<HTMLElement>(null)

	const navRef = useComposedRefs(nav, ref)

	// `null` until the first measure: the server, and the hydration render.
	const [collapsed, setCollapsed] = useState<number | null>(null)

	// The answer that the rule shows, so the observer compares a reading with it.
	const shown = useRef<number | null>(null)

	const commit = useCallback((next: number) => {
		shown.current = next

		setCollapsed(next)
	}, [])

	const measure = useEffectEvent(() => {
		if (nav.current) commit(breadcrumbFit(nav.current))
	})

	// A resize commits its answer before the paint, so the frame that narrows the row
	// does not clip the current page.
	useLayoutEffect(() => {
		const el = nav.current

		if (!el) return

		return observeResizeBeforePaint(el, () => {
			const next = breadcrumbFit(el)

			return next === shown.current ? undefined : () => commit(next)
		})
	}, [commit])

	useLayoutEffect(() => {
		measure()
	})

	// The layout effect above measures before the first paint. This one only
	// waits for the fonts, so it is passive.
	useEffect(() => {
		let canceled = false

		document.fonts?.ready.then(() => {
			if (!canceled) measure()
		})

		return () => {
			canceled = true
		}
	}, [])

	const rule = breadcrumbFitRule(id, collapsed)

	return (
		<>
			{rule ? <style>{rule}</style> : null}

			<nav
				aria-label={intl.formatMessage(breadcrumbMessages.label)}
				className={cn('flex min-w-0 items-center', className)}
				{...props}
				// After the spread: the fit and its rule select on these.
				ref={navRef}
				data-slot="breadcrumb"
				data-collapse={id}
			>
				{children}
			</nav>
		</>
	)
}
