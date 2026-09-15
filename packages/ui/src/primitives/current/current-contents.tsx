'use client'

import { type ComponentProps, useEffect, useRef } from 'react'
import { cn } from '../../core'
import { ReducedMotion } from '../reduced-motion'
import {
	CurrentFadeContext,
	type CurrentMount,
	CurrentMountContext,
	CurrentSettledContext,
} from './current'
import { useCurrentContentsMorph } from './use-current-contents-morph'

/** Props for {@link CurrentContents}: the `slotPrefix` stamp, the `fade` height animation, and the inactive-panel `mount` policy, over `<div>` attributes. */
export type CurrentContentsProps = ComponentProps<'div'> & {
	/** Slot prefix stamped as `data-slot="<slotPrefix>-contents"`; pairs with `CurrentContent` siblings. */
	slotPrefix: string
	/**
	 * Animate height between active panels.
	 *
	 * @defaultValue true
	 */
	fade?: boolean
	/**
	 * How inactive panels are held. Defaults to `active`, where only the active
	 * panel sits in the DOM. Keeping inactive panels mounted is therefore opt-in
	 * through `always` or `lazy`, independent of `fade`, which only drives the
	 * height animation.
	 *
	 * @remarks
	 * With `always`/`lazy`, held-inactive panels wrap in
	 * `<Activity mode="hidden">`. They are kept in the DOM with state preserved,
	 * but their effects are torn down and re-rendering is deferred until shown.
	 * Under `fade` the Activity hold applies only at rest, because its
	 * `display: none` can't animate. A held panel wakes for the crossfade, and
	 * drops back into the hidden Activity once its fade-out lands.
	 *
	 * Under `fade`, mount and unmount ride the cross-fade rather than defeating
	 * it. A panel mounting after the container's initial render enters from
	 * transparent. A `lazy` first visit or a fresh `active` mount is such a panel.
	 * An `active` outgoing panel stays mounted until its fade-out completes, then
	 * unmounts.
	 *
	 * @see {@link CurrentMount}
	 */
	mount?: CurrentMount
}

/**
 * Outer container for the current-panel cascade. When `fade` is true, the box
 * rests at `height: auto` and animates height only across discrete changes. A
 * panel switch, or content growing in place, is such a change. It then hands the
 * height back to layout, so a window resize reflows the box without re-rendering
 * anything. It also signals its `CurrentContent` children to fade in place. When
 * `fade` is false, renders a plain wrapper. Either way it broadcasts the
 * resolved {@link CurrentMount} policy, so `CurrentContent` knows whether to
 * keep, lazily mount, or unmount unmatched children. A fading container also
 * broadcasts its post-mount latch, so late-mounting panels enter from
 * transparent.
 */
export function CurrentContents({
	slotPrefix,
	fade = true,
	mount = 'active',
	className,
	children,
	...props
}: CurrentContentsProps) {
	const containerRef = useRef<HTMLDivElement>(null)

	useCurrentContentsMorph(containerRef, fade)

	// Post-mount latch for entrance choreography: panels in this first commit
	// read false and skip their entrance; panels mounting on a later value
	// change read true and fade in from transparent.
	const settledRef = useRef(false)

	useEffect(() => {
		settledRef.current = true
	}, [])

	if (!fade) {
		return (
			// Re-scope the fade signal off, so panels of a non-fading container
			// nested inside a fading one render the plain branch.
			<CurrentFadeContext value={false}>
				<CurrentMountContext value={mount}>
					<div data-slot={`${slotPrefix}-contents`} className={className} {...props}>
						{children}
					</div>
				</CurrentMountContext>
			</CurrentFadeContext>
		)
	}

	return (
		<CurrentFadeContext value>
			<CurrentMountContext value={mount}>
				<CurrentSettledContext value={settledRef}>
					<ReducedMotion>
						{/* A plain div. The morph hook pins and tweens the inline height
						    itself, outside React. No render can therefore stamp the resting
						    `auto` back over an in-flight morph. */}
						<div
							ref={containerRef}
							data-slot={`${slotPrefix}-contents`}
							className={cn('relative overflow-hidden', className)}
							{...props}
						>
							{children}
						</div>
					</ReducedMotion>
				</CurrentSettledContext>
			</CurrentMountContext>
		</CurrentFadeContext>
	)
}
