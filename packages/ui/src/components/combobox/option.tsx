'use client'

import type {
	SelectDescriptionProps,
	SelectLabelProps,
	SelectOptionProps,
} from '../../primitives/select-option'
import { createSelectOption } from '../../primitives/select-option'
import { useComboboxContext } from './combobox'

export type ComboboxOptionProps = SelectOptionProps

export type ComboboxLabelProps = SelectLabelProps

export type ComboboxDescriptionProps = SelectDescriptionProps

const { Option, Label, Description } = createSelectOption({
	slotPrefix: 'combobox',
	useContext: useComboboxContext,
})

export { Description as ComboboxDescription, Label as ComboboxLabel, Option as ComboboxOption }
