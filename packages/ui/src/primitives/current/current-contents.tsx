'use client'

import { motion } from 'motion/react'
import { type ComponentPropsWithoutRef, useRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/current'
import { ReducedMotion } from '../reduced-motion'
import { CurrentFadeContext, type CurrentMount, CurrentMountContext, resolveMount } from './current'
import { useCurrentContentsHeight } from './use-current-contents-height'

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
	 * How inactive panels are held. Defaults from `fade` — `always` when fading,
	 * `active` otherwise — so an explicit value is only needed to break that
	 * pairing.
	 *
	 * @remarks
	 * With `always`/`lazy` and `fade={false}`, held-inactive panels wrap in
	 * `<Activity mode="hidden">`: kept in the DOM with state preserved, but their
	 * effects are torn down and re-rendering is deferred until shown. `fade` and
	 * `mount="lazy"`/`"always"` still hold panels via the opacity cross-fade
	 * instead, since `Activity`'s `display: none` can't animate.
	 *
	 * @see {@link CurrentMount}
	 */
	mount?: CurrentMount
}

/**
 * Outer container for the current-panel cascade. When `fade` is true, animates
 * height between the active `CurrentContent` and the surrounding box, and
 * signals its `CurrentContent` children to fade in place. When `fade` is false,
 * renders a plain wrapper. Either way it broadcasts the resolved {@link CurrentMount}
 * policy so `CurrentContent` knows whether to keep, lazily mount, or unmount
 * unmatched children.
 */
export function CurrentContents({
	slotPrefix,
	fade = true,
	mount,
	className,
	children,
	...props
}: CurrentContentsProps) {
	const containerRef = useRef<HTMLDivElement>(null)

	const height = useCurrentContentsHeight(containerRef, fade)

	const resolvedMount = resolveMount(fade, mount)

	if (!fade) {
		return (
			<CurrentMountContext value={resolvedMount}>
				<div data-slot={`${slotPrefix}-contents`} className={className} {...props}>
					{children}
				</div>
			</CurrentMountContext>
		)
	}

	return (
		<CurrentFadeContext value>
			<CurrentMountContext value={resolvedMount}>
				<ReducedMotion>
					<motion.div
						ref={containerRef}
						data-slot={`${slotPrefix}-contents`}
						animate={height !== undefined ? { height } : undefined}
						initial={false}
						transition={k.transition}
						className={cn('relative overflow-hidden', className)}
					>
						{children}
					</motion.div>
				</ReducedMotion>
			</CurrentMountContext>
		</CurrentFadeContext>
	)
}
