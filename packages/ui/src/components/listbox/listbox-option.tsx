'use client'

import type { OptionDescriptionProps, OptionLabelProps, OptionProps } from '../../primitives/option'
import { createSelectOption } from '../../primitives/option'
import { useListboxContext } from './context'

/** Props for {@link ListboxOption}: a selectable `value` plus the shared option attributes. */
export type ListboxOptionProps = OptionProps

/** Props for {@link ListboxLabel}: the option's primary-text slot attributes. */
export type ListboxLabelProps = OptionLabelProps

/** Props for {@link ListboxDescription}: the option's supporting-text slot attributes. */
export type ListboxDescriptionProps = OptionDescriptionProps

const { Option, Label, Description } = createSelectOption({
	slotPrefix: 'listbox',
	useContext: useListboxContext,
})

export {
	/** Supporting secondary text for a {@link ListboxOption}. */
	Description as ListboxDescription,
	/** Primary text label for a {@link ListboxOption}. */
	Label as ListboxLabel,
	/** Selectable option within a {@link Listbox}, carrying the value selected when activated and reflecting checked/active state from listbox context. */
	Option as ListboxOption,
}
