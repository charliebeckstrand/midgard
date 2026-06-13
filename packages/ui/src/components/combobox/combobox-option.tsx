'use client'

import type { OptionDescriptionProps, OptionLabelProps, OptionProps } from '../../primitives/option'
import { createSelectOption } from '../../primitives/option'
import { useComboboxContext } from './context'

/** Props for {@link ComboboxOption}; `value` is matched against the combobox selection. */
export type ComboboxOptionProps = OptionProps

/** Props for {@link ComboboxLabel}; extends native `<span>` attributes. */
export type ComboboxLabelProps = OptionLabelProps

/** Props for {@link ComboboxDescription}; extends native `<span>` attributes. */
export type ComboboxDescriptionProps = OptionDescriptionProps

/**
 * {@link ComboboxOption} (`role="option"`), {@link ComboboxLabel}, and
 * {@link ComboboxDescription} for the {@link Combobox} panel. The
 * active-descendant variant: each option mints a stable `id` the input
 * references and holds DOM focus on the input. Reads selection state and the
 * `onSelect` callback from combobox context.
 */
const { Option, Label, Description } = createSelectOption({
	slotPrefix: 'combobox',
	activeDescendant: true,
	useContext: useComboboxContext,
})

export { Description as ComboboxDescription, Label as ComboboxLabel, Option as ComboboxOption }
