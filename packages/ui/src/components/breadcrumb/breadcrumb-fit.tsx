'use client'

import {
	type ComponentProps,
	useEffect,
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
 * where the parser meets it, and it puts a `<style>` in the head at once. The
 * style holds the rule of {@link breadcrumbFitRule} for each answer that the
 * trail can give, and each rule applies only while the style carries its
 * answer in `data-collapsed`. The script carries the source text of both
 * functions. It changes no markup that React renders, so hydration finds the
 * server's markup.
 *
 * The script then waits for a `ResizeObserver` report. The rest of the row is
 * not parsed yet, and a trail in a Suspense boundary streams in a hidden
 * segment that has no width until React reveals it. The observer reports after
 * layout and before the paint. The script then sets the answer of
 * {@link breadcrumbFit} on the style.
 *
 * The report comes inside a frame, so the script changes an attribute there,
 * not a style sheet. In WebKit, a new style sheet inside the first frame
 * removes the effect of the scroll-driven animations in that paint. Thus the
 * edge fade of a rail (`scroll-fade-inline`) blinks.
 */
function fitScript(id: string): string {
	const key = JSON.stringify(id)

	return `(function(s){var n=s&&s.previousElementSibling;if(!n||!window.ResizeObserver)return;var e=document.createElement('style'),t='',l=n.querySelectorAll('[data-slot=breadcrumb-label]').length;e.setAttribute('data-breadcrumb-fit',${key});for(var c=1;c<l;c++)t+=(${breadcrumbFitRule})(${key},c,':root:has(style[data-breadcrumb-fit='+JSON.stringify(${key})+'][data-collapsed="'+c+'"]) ');e.textContent=t;document.head.appendChild(e);var o=new ResizeObserver(function(){if(!n.clientWidth)return;o.disconnect();e.setAttribute('data-collapsed',(${breadcrumbFit})(n))});o.observe(n)})(document.currentScript)`
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
