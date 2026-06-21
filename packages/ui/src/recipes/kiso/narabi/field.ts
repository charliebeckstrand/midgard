/**
 * Narabi field: slot adjacency rules for `<Field>` stacks. Sibling-
 * selector margins space label / description / control / alert slots
 * evenly via a single rule per transition pair.
 *
 * Layer: kiso · Concern: field adjacency
 */

export const field = [
	'*:data-[slot=label]:font-medium',
	// Gap from the label to its control. The margin sits on the label — always a
	// real <label> box — not the control, because a `display:contents` control
	// wrapper (Listbox/Select, DatePicker) generates no box, so a margin placed on
	// it would be dropped. The `:not(description)` arm lets a description hug the
	// label instead; its own gap to the control is the next rule's job.
	'[&>[data-slot=label]:has(+*:not([data-slot=description]))]:mb-1',
	'[&>[data-slot=description]+[data-slot]]:mt-1',
	'[&>[data-slot=control]+[data-slot]]:mt-2',
	'[&>[data-slot=control-frame]+[data-slot]]:mt-2',
	'[&>[data-slot=field]+[data-slot]]:mt-2',
	'[&>[data-slot=field]+[role=alert]]:mt-2',
]
