'use client'

import { motion } from 'motion/react'
import { type ComponentPropsWithoutRef, useEffect, useRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/current'
import { ReducedMotion } from '../reduced-motion'
import {
	CurrentFadeContext,
	type CurrentMount,
	CurrentMountContext,
	CurrentSettledContext,
	resolveMount,
} from './current'
import { useCurrentContentsMorph } from './use-current-contents-morph'

export type CurrentContentsProps = ComponentPropsWithoutRef<'div'> & {
	/** Slot prefix stamped as `data-slot="<slotPrefix>-contents"`; pairs with `CurrentContent` siblings. */
	slotPrefix: string
	/**
	 * Animate height between active panels.
	 *
	 * @defaultValue true
	 */
	fade?: boolean
	/**
	 * How inactive panels are held. Defaults to `active` — only the active panel
	 * sits in the DOM — so keeping inactive panels mounted is opt-in through
	 * `always` or `lazy`, independent of `fade` (which only drives the height
	 * animation).
	 *
	 * @remarks
	 * With `always`/`lazy` and `fade={false}`, held-inactive panels wrap in
	 * `<Activity mode="hidden">`: kept in the DOM with state preserved, but their
	 * effects are torn down and re-rendering is deferred until shown. `fade` and
	 * `mount="lazy"`/`"always"` still hold panels via the opacity cross-fade
	 * instead, since `Activity`'s `display: none` can't animate.
	 *
	 * Under `fade`, mount and unmount ride the cross-fade rather than defeating
	 * it: a panel mounting after the container's initial render (a `lazy` first
	 * visit or a fresh `active` mount) enters from transparent, and an `active`
	 * outgoing panel stays mounted until its fade-out completes, then unmounts.
	 *
	 * @see {@link CurrentMount}
	 */
	mount?: CurrentMount
}

/**
 * Outer container for the current-panel cascade. When `fade` is true, the box
 * rests at `height: auto` and animates height only across discrete changes —
 * a panel switch, or content growing in place — then hands the height back to
 * layout, so a window resize reflows the box without re-rendering anything.
 * It also signals its `CurrentContent` children to fade in place. When `fade`
 * is false, renders a plain wrapper. Either way it broadcasts the resolved
 * {@link CurrentMount} policy so `CurrentContent` knows whether to keep,
 * lazily mount, or unmount unmatched children; a fading container also
 * broadcasts its post-mount latch so late-mounting panels enter from
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

	const { morphTo, release } = useCurrentContentsMorph(containerRef, fade)

	const resolvedMount = resolveMount(fade, mount)

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
				<CurrentMountContext value={resolvedMount}>
					<div data-slot={`${slotPrefix}-contents`} className={className} {...props}>
						{children}
					</div>
				</CurrentMountContext>
			</CurrentFadeContext>
		)
	}

	return (
		<CurrentFadeContext value>
			<CurrentMountContext value={resolvedMount}>
				<CurrentSettledContext value={settledRef}>
					<ReducedMotion>
						{/* At rest the height target is `auto`, so completed and cancelled
						    morphs alike settle the box back into layout's hands. */}
						<motion.div
							ref={containerRef}
							data-slot={`${slotPrefix}-contents`}
							animate={{ height: morphTo ?? 'auto' }}
							initial={false}
							transition={k.transition}
							onAnimationComplete={morphTo === null ? undefined : release}
							className={cn('relative overflow-hidden', className)}
						>
							{children}
						</motion.div>
					</ReducedMotion>
				</CurrentSettledContext>
			</CurrentMountContext>
		</CurrentFadeContext>
	)
}
