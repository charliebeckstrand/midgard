/**
 * Narabi field: slot adjacency rules for `<Field>` stacks. Sibling-
 * selector margins space label / description / control / alert slots
 * evenly via a single rule per transition pair.
 *
 * Layer: kiso · Concern: field adjacency
 */

export const field = [
	'*:data-[slot=label]:font-medium',
	'[&>[data-slot=label]+[data-slot]:not([data-slot=description])]:mt-1',
	// A `display:contents` control wrapper (Listbox/Select, DatePicker) generates
	// no box of its own, so the label→control rule above can't sit a margin on it;
	// carry the gap to the real trigger nested one level inside instead.
	'[&>[data-slot=label]+.contents>*:first-child]:mt-1',
	'[&>[data-slot=description]+[data-slot]]:mt-1',
	'[&>[data-slot=control]+[data-slot]]:mt-2',
	'[&>[data-slot=control-frame]+[data-slot]]:mt-2',
	'[&>[data-slot=field]+[data-slot]]:mt-2',
	'[&>[data-slot=field]+[role=alert]]:mt-2',
]
