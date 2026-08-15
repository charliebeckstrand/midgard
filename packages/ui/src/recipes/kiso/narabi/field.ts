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
	// Gap from a control to the message under it, named by the message rather than
	// by what precedes it. The rules above name the control, which only reaches the
	// controls that render their frame as a direct child of the Field: a control
	// that wraps its own frame (Listbox, DatePicker, Combobox) put a wrapper
	// between the two, and a wrapper that renames its `data-slot` (AddressInput
	// over Combobox) could not be named at all — so a message under any of them
	// hugged the control while the Input beside it did not.
	//
	// The label and description arms are excluded because each owns its own gap
	// above: a message directly under a label is the field's only content, and one
	// under a description takes the tighter `mt-1` the rule above gives it. Both
	// compound selectors outrank that rule, so the exclusions are what keep it.
	'[&>:not([data-slot=label]):not([data-slot=description])+[data-slot=message]]:mt-2',
	'[&>:not([data-slot=label]):not([data-slot=description])+[role=alert]]:mt-2',
]
