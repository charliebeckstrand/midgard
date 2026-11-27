/**
 * Tells if a `transitionend` or a `transitioncancel` lands the transition of its
 * property: no later transition of that property runs on the target.
 *
 * @remarks
 * A `transitionend` always lands. A `transitioncancel` has two causes. An
 * ancestor's `display: none` stops the transition, and no transition starts
 * when the ancestor shows again, so the cancel is the landing. A change of
 * style in the middle of a transition (a collapse during an open) also cancels
 * it, but the browser starts the transition to the new value at once. The
 * replacement then sends the landing, so the cancel does not land.
 *
 * jsdom runs no transitions and has no `getAnimations`, so there each event lands.
 */
export function transitionLanded(event: TransitionEvent): boolean {
	if (event.type !== 'transitioncancel') return true

	const target = event.target as Element

	return !target
		.getAnimations?.()
		.some(
			(animation) =>
				'transitionProperty' in animation && animation.transitionProperty === event.propertyName,
		)
}
