'use client'

import { AnimatePresence } from 'motion/react'
import type { ReactNode } from 'react'
import { ReducedMotion } from '../reduced-motion'
import { type HeldMotionPreset, heldMotionProps, heldMotionTargets } from './mount-held-motion'
import { MountHold } from './mount-hold'
import type { MountHoldState } from './use-mount'

/** Props for {@link MountPresence}. */
export type MountPresenceProps = {
	/** Whether the panel is open now. */
	open: boolean
	/** The panel's hold, from a deferred `useMountHold`. */
	hold: MountHoldState
	/** The recipe's enter/exit preset of the panel. */
	preset: HeldMotionPreset
	/** Name for the Activity boundary of a held panel, surfaced in React DevTools. */
	name: string
	/** The arrival gate's completion handler, if the panel has one. */
	onAnimationComplete?: (definition: unknown) => void
	/**
	 * Renders the panel. Spread `motionProps` onto the motion element of the
	 * panel. `targets` gives the props of a motion element inside the panel from
	 * its own preset, such as content that moves in the panel.
	 */
	children: (motionProps: object, targets: (preset: HeldMotionPreset) => object) => ReactNode
}

/** The props of an inner motion element of an unheld panel: its whole preset. */
const wholePreset = (preset: HeldMotionPreset) => preset

/**
 * The animated presence of a disclosure panel under a `mount` policy.
 *
 * `active` unmounts the closed panel, so its exit rides `AnimatePresence` and
 * the enter/exit pair of the preset applies as written. A held panel stays
 * mounted in {@link MountHold}, and animates between its open and closed states
 * in place through {@link heldMotionProps}. It rests only once the closing
 * transition lands, because `display: none` cannot animate.
 *
 * @internal
 */
export function MountPresence({
	open,
	hold,
	preset,
	name,
	onAnimationComplete,
	children,
}: MountPresenceProps) {
	if (!hold.held) {
		return (
			<ReducedMotion>
				<AnimatePresence initial={false}>
					{open &&
						children(
							{
								initial: preset.initial,
								animate: preset.animate,
								exit: preset.exit,
								transition: preset.transition,
								onAnimationComplete,
							},
							wholePreset,
						)}
				</AnimatePresence>
			</ReducedMotion>
		)
	}

	if (!hold.present) return null

	return (
		<ReducedMotion>
			<MountHold hold={hold} name={name}>
				{children(heldMotionProps(preset, open, hold, onAnimationComplete), (inner) =>
					heldMotionTargets(inner, open, hold),
				)}
			</MountHold>
		</ReducedMotion>
	)
}
