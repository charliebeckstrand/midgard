'use client'

import { type ComponentProps, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '../../core'
import { isRtl } from '../../hooks/a11y/logical-arrow'
import { useComposedRef } from '../../hooks/use-composed-ref'
import type { Mount } from '../mount'
import { ReducedMotion } from '../reduced-motion'
import {
	CurrentAnimationContext,
	type CurrentDirection,
	CurrentDirectionContext,
	CurrentMountContext,
	CurrentSettledContext,
	useCurrent,
} from './current'
import { useCurrentContentsMorph } from './use-current-contents-morph'

/** Props for {@link CurrentContents}: the `slotPrefix` stamp, the switch `animate` style, and the inactive-panel `mount` policy, over `<div>` attributes. */
export type CurrentContentsProps = ComponentProps<'div'> & {
	/** Slot prefix stamped as `data-slot="<slotPrefix>-contents"`; pairs with `CurrentContent` siblings. */
	slotPrefix: string
	/**
	 * Animation style for a panel switch. `'fade'` fades the outgoing panel out
	 * and the incoming panel in. `'slide'` slides the two panels side by side,
	 * toward the side of the incoming panel in the reading order. Both animate
	 * the height of the box. `false` disables the animation.
	 *
	 * @defaultValue 'fade'
	 */
	animate?: 'fade' | 'slide' | false
	/**
	 * How inactive panels are held. Defaults to `active`, where only the active
	 * panel sits in the DOM. Keeping inactive panels mounted is therefore opt-in
	 * through `always` or `lazy`, independent of `animate`.
	 *
	 * @remarks
	 * With `always`/`lazy`, held-inactive panels wrap in
	 * `<Activity mode="hidden">`. They are kept in the DOM with state preserved,
	 * but their effects are torn down and re-rendering is deferred until shown.
	 * Under an animation the Activity hold applies only at rest, because its
	 * `display: none` can't animate. A held panel wakes for the animation, and
	 * drops back into the hidden Activity once its exit lands.
	 *
	 * Under an animation, mount and unmount ride it rather than defeating it. A panel mounting after the container's initial render enters from
	 * transparent. A `lazy` first visit or a fresh `active` mount is such a panel.
	 * An `active` outgoing panel stays mounted until its exit completes, then
	 * unmounts.
	 *
	 * @defaultValue 'active'
	 * @see {@link Mount}
	 */
	mount?: Mount
}

/**
 * Outer container for the current-panel cascade. When `animate` is `'fade'` or
 * `'slide'`, the box rests at `height: auto` and animates height only across
 * discrete changes. A panel switch, or content growing in place, is such a
 * change. It then hands the height back to layout, so a window resize reflows
 * the box without re-rendering anything. It also tells its `CurrentContent`
 * children how to animate. Under `'slide'` it reads the direction of each switch
 * from the document order of the two panels, and broadcasts it. When `animate`
 * is `false`, renders a plain wrapper. Either way it broadcasts the resolved
 * {@link Mount} policy, so `CurrentContent` knows whether to keep, lazily
 * mount, or unmount unmatched children. An animating container also broadcasts
 * its post-mount latch, so late-mounting panels enter from transparent. A consumer `ref` reaches the container element.
 */
export function CurrentContents({
	slotPrefix,
	animate = 'fade',
	mount = 'active',
	className,
	children,
	ref,
	...props
}: CurrentContentsProps) {
	const containerRef = useRef<HTMLDivElement>(null)

	// The morph hook reads `containerRef`, so a consumer `ref` joins it rather
	// than replaces it.
	const setContainer = useComposedRef(containerRef, ref)

	useCurrentContentsMorph(containerRef, animate)

	// Post-mount latch for entrance choreography: panels in this first commit
	// read false and skip their entrance; panels mounting on a later value
	// change read true and enter from transparent.
	const settledRef = useRef(false)

	useEffect(() => {
		settledRef.current = true
	}, [])

	const value = useCurrent()?.value

	const [direction, setDirection] = useState<CurrentDirection>(1)

	// The panel shown after the last switch. It is the outgoing panel of the next
	// switch.
	const shownRef = useRef<Element | null>(null)

	// The switch direction comes from the document order of the two panels. The
	// incoming panel can mount in this commit, so the order is read after the
	// commit and before the paint. The outgoing panel stays in the DOM for its
	// slide. A changed direction renders again before the paint, so the panels
	// start their slides from the correct side.
	useLayoutEffect(() => {
		const element = containerRef.current

		if (!element || animate !== 'slide' || value === undefined) return

		const shown = element.querySelectorAll(':scope > [data-current]')

		const incoming = shown.length === 1 ? (shown[0] ?? null) : null

		const outgoing = shownRef.current

		shownRef.current = incoming

		if (!incoming || !outgoing?.isConnected || incoming === outgoing) return

		const follows = Boolean(
			outgoing.compareDocumentPosition(incoming) & Node.DOCUMENT_POSITION_FOLLOWING,
		)

		// In a right-to-left layout the following panel lies to the left.
		setDirection(follows === isRtl(element) ? -1 : 1)
	}, [animate, value])

	if (animate === false) {
		return (
			// Re-scope the animation off, so panels of a still container nested
			// inside an animating one render the plain branch.
			<CurrentAnimationContext value={false}>
				<CurrentMountContext value={mount}>
					<div ref={ref} data-slot={`${slotPrefix}-contents`} className={className} {...props}>
						{children}
					</div>
				</CurrentMountContext>
			</CurrentAnimationContext>
		)
	}

	return (
		<CurrentAnimationContext value={animate}>
			<CurrentMountContext value={mount}>
				<CurrentSettledContext value={settledRef}>
					<CurrentDirectionContext value={direction}>
						<ReducedMotion>
							{/* A plain div. The morph hook pins and tweens the inline height
						    itself, outside React. No render can therefore stamp the resting
						    `auto` back over an in-flight morph. */}
							<div
								ref={setContainer}
								data-slot={`${slotPrefix}-contents`}
								className={cn('relative overflow-hidden', className)}
								{...props}
							>
								{children}
							</div>
						</ReducedMotion>
					</CurrentDirectionContext>
				</CurrentSettledContext>
			</CurrentMountContext>
		</CurrentAnimationContext>
	)
}
