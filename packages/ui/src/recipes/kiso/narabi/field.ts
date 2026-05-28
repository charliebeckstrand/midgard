/**
 * Narabi field — slot adjacency rules for `<Field>` stacks. Sibling-
 * selector margins keep label / description / control / alert slots
 * evenly spaced without each slot paying for its own first-child reset.
 *
 * Layer: kiso · Concern: field adjacency
 */

export const field = [
	'*:data-[slot=label]:font-medium',
	'[&>[data-slot=label]+[data-slot]:not([data-slot=description])]:mt-1',
	'[&>[data-slot=description]+[data-slot]]:mt-1',
	'[&>[data-slot=control]+[data-slot]]:mt-2',
	'[&>[data-slot=control-frame]+[data-slot]]:mt-2',
	'[&>[data-slot=field]+[data-slot]]:mt-2',
	'[&>[data-slot=field]+[role=alert]]:mt-2',
]
