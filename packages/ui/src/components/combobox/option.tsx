'use client'

import type {
	SelectDescriptionProps,
	SelectLabelProps,
	SelectOptionProps,
} from '../../primitives/create-select-option'
import { createSelectOption } from '../../primitives/create-select-option'
import { useComboboxContext } from './combobox'

export type ComboboxOptionProps = SelectOptionProps

export type ComboboxLabelProps = SelectLabelProps

export type ComboboxDescriptionProps = SelectDescriptionProps

const { Option, Label, Description } = createSelectOption({
	slotPrefix: 'combobox',
	useContext: useComboboxContext,
})

export { Option as ComboboxOption, Label as ComboboxLabel, Description as ComboboxDescription }
