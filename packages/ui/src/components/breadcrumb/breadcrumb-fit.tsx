'use client'

import {
	type ComponentProps,
	useEffectEvent,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from 'react'
import { cn } from '../../core'
import { useComposedRef } from '../../hooks/use-composed-ref'
import { useHydrated } from '../../hooks/use-hydrated'
import { useResizeObserver } from '../../hooks/use-resize-observer'
import { breadcrumbFit, breadcrumbFitRule } from './breadcrumb-fit-rule'

/**
 * The pre-paint step of a collapsing trail, for the `<nav>` just before it.
 *
 * The server cannot know the room of the row, so its markup holds every crumb
 * whole, and a browser paints that markup before React runs. This script runs
 * where the parser meets it and waits for a `ResizeObserver` report: a trail in
 * a Suspense boundary streams in a hidden segment that has no width until React
 * reveals it, and the observer reports after layout and before that paint. It
 * then writes the rule of {@link breadcrumbFitRule} for the answer of
 * {@link breadcrumbFit} into a `<style>` in the head, from the source text of
 * both functions. The script changes no markup that React renders, so
 * hydration finds the server's markup.
 */
function fitScript(id: string): string {
	const key = JSON.stringify(id)

	return `(function(s){var n=s&&s.previousElementSibling;if(!n||!window.ResizeObserver)return;var o=new ResizeObserver(function(){if(!n.clientWidth)return;o.disconnect();var c=(${breadcrumbFit})(n);if(!c)return;var e=document.createElement('style');e.setAttribute('data-breadcrumb-fit',${key});e.textContent=(${breadcrumbFitRule})(${key},c);document.head.appendChild(e)});o.observe(n)})(document.currentScript)`
}

/**
 * The `<nav>` of a collapsing `Breadcrumb`: it measures the row, renders the
 * rule of the fit, and renders the pre-paint step while the markup is the
 * server's.
 *
 * @remarks
 * The fit re-measures on resize, after each commit, and once after
 * `document.fonts.ready`: a late font changes what the text takes without
 * changing the box that holds it. The measure runs in a layout effect, so a
 * client render is never painted at the wrong fit. On the first measure the
 * rule of the pre-paint step leaves the head, after the rule that React renders
 * has taken its place.
 * @internal
 */
export function BreadcrumbFit({ ref, className, children, ...props }: ComponentProps<'nav'>) {
	const id = useId()

	const nav = useRef<HTMLElement>(null)

	const navRef = useComposedRef(nav, ref)

	// `null` until the first measure: the server, and the hydration render.
	const [collapsed, setCollapsed] = useState<number | null>(null)

	const hydrated = useHydrated()

	const measure = useEffectEvent(() => {
		if (nav.current) setCollapsed(breadcrumbFit(nav.current))
	})

	useResizeObserver(nav, measure)

	useLayoutEffect(() => {
		measure()
	})

	useLayoutEffect(() => {
		let canceled = false

		document.fonts?.ready.then(() => {
			if (!canceled) measure()
		})

		return () => {
			canceled = true
		}
	}, [])

	// The rule of the pre-paint step leaves once React's own rule holds the fit.
	useLayoutEffect(() => {
		if (collapsed === null) return

		document.head.querySelector(`style[data-breadcrumb-fit="${CSS.escape(id)}"]`)?.remove()
	}, [collapsed, id])

	const rule = breadcrumbFitRule(id, collapsed ?? 0)

	return (
		<>
			{rule ? <style>{rule}</style> : null}

			<nav
				aria-label="Breadcrumb"
				className={cn('flex min-w-0 items-center', className)}
				{...props}
				// After the spread: the fit and its rule select on these.
				ref={navRef}
				data-slot="breadcrumb"
				data-collapse={id}
			>
				{children}
			</nav>

			{hydrated ? null : (
				// biome-ignore lint/security/noDangerouslySetInnerHtml: a constant script with no user input.
				<script dangerouslySetInnerHTML={{ __html: fitScript(id) }} />
			)}
		</>
	)
}
