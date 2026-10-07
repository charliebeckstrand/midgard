import type { MountHoldState } from './mount'

/**
 * The recipe preset a disclosure panel animates with: the `AnimatePresence`
 * enter/exit triple plus its transition.
 */
export type HeldMotionPreset = {
	initial: object
	animate: object
	exit: object
	transition: object
}

/**
 * Motion props for a panel a deferred {@link MountHoldState} keeps mounted. Held, it
 * animates between its open and closed states in place rather than entering and
 * exiting. It therefore takes no `exit`, which only `AnimatePresence` reads.
 * Both landings arrive on one `onAnimationComplete`: the close that rests the
 * hold, and the open the arrival gate reports.
 *
 * @remarks
 * `initial` keys on the state the panel mounted in, not on the policy. Motion
 * reads `initial` at its first `animateChanges`, which a held panel defers until
 * its first reveal. `false` there would suppress the reveal rather than the
 * mount, leaving the panel shut and its landing unreported. A panel that mounted
 * open instead matches `initial` to the target, the other arm of the same guard.
 * It still takes its open state without playing anything.
 *
 * @param preset - The recipe's enter/exit preset.
 * @param open - Whether the panel is open now.
 * @param hold - The panel's hold; `rest` latches it on every landing and
 * `mountedActive` names the state it mounted in.
 * @param onAnimationComplete - The arrival gate's completion handler, if the panel has one.
 * @returns The `initial`/`animate`/`transition`/`onAnimationComplete` bag to
 * spread onto the motion element.
 * @internal
 */
export function heldMotionProps<P extends HeldMotionPreset>(
	preset: P,
	open: boolean,
	hold: Pick<MountHoldState, 'rest' | 'mountedActive'>,
	onAnimationComplete?: (definition: unknown) => void,
): {
	initial: P['initial'] | P['animate']
	animate: P['animate'] | P['exit']
	transition: P['transition']
	onAnimationComplete: (definition: unknown) => void
} {
	return {
		...heldMotionTargets(preset, open, hold),
		onAnimationComplete: (definition) => {
			hold.rest()

			onAnimationComplete?.(definition)
		},
	}
}

/**
 * The targets of {@link heldMotionProps} without its landing handler. Use it for a
 * motion element inside a held panel, for example the content that moves in the
 * panel. The panel element itself rests the hold, so this element must not.
 *
 * @param preset - The recipe's enter/exit preset.
 * @param open - Whether the panel is open now.
 * @param hold - The panel's hold; `mountedActive` names the state it mounted in.
 * @returns The `initial`/`animate`/`transition` bag to spread onto the motion element.
 * @internal
 */
export function heldMotionTargets<P extends HeldMotionPreset>(
	preset: P,
	open: boolean,
	hold: Pick<MountHoldState, 'mountedActive'>,
): {
	initial: P['initial'] | P['animate']
	animate: P['animate'] | P['exit']
	transition: P['transition']
} {
	return {
		initial: hold.mountedActive ? preset.animate : preset.initial,
		animate: open ? preset.animate : preset.exit,
		transition: preset.transition,
	}
}
