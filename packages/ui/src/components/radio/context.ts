'use client'

import { createContext } from '../../core'

/**
 * The state that the enclosing {@link RadioGroup} gives to each {@link Radio}.
 *
 * @internal
 */
export type RadioGroupContextValue = {
	/** The group is read-only. Each radio in it blocks the check. */
	readOnly: boolean
	/**
	 * The id of the `<Control>` or `<Field>` above the group, when there is one.
	 * A radio whose nearest Control has this id is a bare radio of the group. It
	 * does not adopt that id or the description of that Control, because they
	 * are for the group and not for one radio.
	 */
	fieldId: string | undefined
}

/**
 * The state of the enclosing {@link RadioGroup}. The `ControlContext` cannot
 * carry it. A group with no `<Control>` above it has no id to give, and a
 * radio adopts the id of that context.
 *
 * @internal
 */
export const [RadioGroupContext, useRadioGroup] = createContext<RadioGroupContextValue>(
	'RadioGroup',
	{ default: { readOnly: false, fieldId: undefined } },
)
