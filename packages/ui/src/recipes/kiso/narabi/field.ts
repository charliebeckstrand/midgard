/**
 * Narabi field: slot adjacency rules for `<Field>` stacks. Sibling-
 * selector margins space label / description / control / alert slots
 * evenly via a single rule per transition pair. Each gap is a ramp of
 * `dan.space.field`, so it follows density.
 *
 * Layer: kiso · Concern: field adjacency
 */

import { dan } from '../dan'

const { space } = dan

export const field = [
	'*:data-[slot=label]:font-medium',
	// Gap from the label to its control. The margin sits on the label — always a
	// real <label> box — not the control, because a `display:contents` control
	// wrapper (Listbox/Select, DatePicker) generates no box, so a margin placed on
	// it would be dropped. The `:not(description)` arm lets a description hug the
	// label instead; its own gap to the control is the next rule's job.
	space.field.label,
	// A label row: a Flex that holds the label beside an adornment, such as an
	// info button with a tooltip. The button cannot go in the label, because a
	// label must not hold a second labelable element. The row takes the gap that
	// the label takes, and the label in it keeps its weight.
	'[&>[data-slot=flex]>[data-slot=label]]:font-medium',
	space.field.labelRow,
	space.field.description,
	space.field.control,
	// A list of controls, such as a reorderable list of inputs, takes the gap that
	// a single control takes to the slots under it. The rule names the later
	// slots with `~`, not `+`, because a reorderable list puts the hidden live
	// region and instructions of its drag behind the `<ul>`, and they have no slot.
	space.field.list,
	// Gap from a control to the message or the alert under it, named by the message
	// or the alert rather than by what precedes it. The rules above name the control, which only reaches the
	// controls that render their frame as a direct child of the Field: a control
	// that wraps its own frame (Listbox, DatePicker, Combobox) put a wrapper
	// between the two, and a wrapper that renames its `data-slot` (AddressInput
	// over Combobox) could not be named at all — so a message under any of them
	// hugged the control while the Input beside it did not.
	//
	// The label and description arms are excluded because each owns its own gap
	// above: a message directly under a label is the field's only content, and one
	// under a description takes the tighter gap that the rule above gives it. The
	// compound selector outranks that rule, so the exclusions are what keep it.
	// This rule also gives the gap to an alert under a space.field.
	space.field.message,
]
