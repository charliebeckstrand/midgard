'use client'

import type { OptionDescriptionProps, OptionLabelProps, OptionProps } from '../../primitives/option'
import { createSelectOption } from '../../primitives/option'
import { OptionCheckIcon } from '../option'
import { useComboboxContext } from './combobox'

export type ComboboxOptionProps = OptionProps

export type ComboboxLabelProps = OptionLabelProps

export type ComboboxDescriptionProps = OptionDescriptionProps

const { Option, Label, Description } = createSelectOption({
	slotPrefix: 'combobox',
	useContext: useComboboxContext,
	CheckIcon: OptionCheckIcon,
})

export { Description as ComboboxDescription, Label as ComboboxLabel, Option as ComboboxOption }
