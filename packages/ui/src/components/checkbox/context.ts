'use client'

import { createContext } from '../../core/create-context'

/**
 * The state that the enclosing {@link CheckboxGroup} gives to each
 * {@link Checkbox}.
 *
 * @internal
 */
export type CheckboxGroupContextValue = {
	/**
	 * The id of the `<Control>` or `<Field>` above the group, when there is one.
	 * A checkbox whose nearest Control has this id is a bare checkbox of the
	 * group. It does not adopt that id or the description of that Control,
	 * because they are for the group and not for one checkbox.
	 */
	fieldId: string | undefined
}

/**
 * The state of the enclosing {@link CheckboxGroup}, or `undefined` outside a
 * group. A checkbox in a group does not take the `required` state of a
 * Control, because that state is for the group: a required group asks for one
 * checked box, and a native `required` on each box asks for each box.
 *
 * @internal
 */
export const [CheckboxGroupContext, useCheckboxGroup] = createContext<
	CheckboxGroupContextValue | undefined
>('CheckboxGroup', { default: undefined })
