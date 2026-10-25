/**
 * The part of the open state of a `<Tooltip>` that `useTooltipState` keeps:
 * the open state that hover, focus, and click ask for, and the `:disabled`
 * state of the trigger, which releases the hold of `open`.
 * @internal
 */
export type TooltipOpenSources = {
	requested: boolean
	heldDisabled: boolean
}

/**
 * The open state on screen. `held` is the `open` prop, which shows the
 * tooltip open over the request. A trigger that matches `:disabled` releases
 * the hold, and a disabled tooltip never opens.
 *
 * `useTooltipState` and the root of a tooltip that mounted before the load both
 * use this rule. The root reads the props of its own render, so a prop that
 * closes the tooltip closes it in the render that changes the content.
 * @internal
 */
export function isTooltipOpen(
	enabled: boolean,
	held: boolean,
	{ requested, heldDisabled }: TooltipOpenSources,
): boolean {
	return enabled && ((held && !heldDisabled) || requested)
}
