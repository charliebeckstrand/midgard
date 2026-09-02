import type { MountHold } from './mount'

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
 * Motion props for a panel a deferred {@link MountHold} keeps mounted. Held, it
 * animates between its open and closed states in place rather than entering and
 * exiting, so it takes no `exit` (which only `AnimatePresence` reads) and both
 * landings — the close that rests the hold and the open the arrival gate
 * reports — arrive on one `onAnimationComplete`.
 *
 * @remarks
 * `initial` keys on the state the panel mounted in, not on the policy. Motion
 * reads `initial` at its first `animateChanges`, which a held panel defers until
 * its first reveal — so `false` there would suppress the reveal rather than the
 * mount, leaving the panel shut and its landing unreported. A panel that mounted
 * open instead matches `initial` to the target, the other arm of the same guard,
 * so it still takes its open state without playing anything.
 *
 * @param preset - The recipe's enter/exit preset.
 * @param mountedOpen - Whether the panel was open on its first render.
 * @param open - Whether the panel is open now.
 * @param hold - The panel's hold; `rest` latches it on every landing.
 * @param onAnimationComplete - The arrival gate's completion handler.
 * @returns The `initial`/`animate`/`transition`/`onAnimationComplete` bag to
 * spread onto the motion element.
 * @internal
 */
export function heldMotionProps<P extends HeldMotionPreset>(
	preset: P,
	mountedOpen: boolean,
	open: boolean,
	hold: Pick<MountHold, 'rest'>,
	onAnimationComplete: (definition: unknown) => void,
): {
	initial: P['initial'] | P['animate']
	animate: P['animate'] | P['exit']
	transition: P['transition']
	onAnimationComplete: (definition: unknown) => void
} {
	return {
		initial: mountedOpen ? preset.animate : preset.initial,
		animate: open ? preset.animate : preset.exit,
		transition: preset.transition,
		onAnimationComplete: (definition) => {
			hold.rest()

			onAnimationComplete(definition)
		},
	}
}
