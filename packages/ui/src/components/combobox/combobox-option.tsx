'use client'

import type {
	OptionDescriptionProps,
	OptionLabelProps,
	OptionTextProps,
	SelectOptionProps,
} from '../../primitives/option'
import { createSelectOption } from '../../primitives/option'
import { useComboboxContext } from './context'

/** Props for {@link ComboboxOption}; `value` is matched against the combobox selection. */
export type ComboboxOptionProps = SelectOptionProps

/** Props for {@link ComboboxLabel}; extends native `<span>` attributes. */
export type ComboboxLabelProps = OptionLabelProps

/** Props for {@link ComboboxText}; extends native `<span>` attributes. */
export type ComboboxTextProps = OptionTextProps

/** Props for {@link ComboboxDescription}; extends native `<span>` attributes. */
export type ComboboxDescriptionProps = OptionDescriptionProps

/**
 * {@link ComboboxOption} (`role="option"`), {@link ComboboxLabel},
 * {@link ComboboxText}, and {@link ComboboxDescription} for the {@link Combobox}
 * panel. {@link ComboboxText} stacks the label over the description. The
 * active-descendant variant: each option mints a stable `id` the input
 * references and holds DOM focus on the input. Reads selection state and the
 * `onSelect` callback from combobox context.
 */
const { Option, Label, Text, Description } = createSelectOption({
	slotPrefix: 'combobox',
	activeDescendant: true,
	useSelection: useComboboxContext,
})

export {
	Description as ComboboxDescription,
	Label as ComboboxLabel,
	Option as ComboboxOption,
	Text as ComboboxText,
}
