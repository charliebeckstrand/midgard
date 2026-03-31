'use client'

import type {
	SelectDescriptionProps,
	SelectLabelProps,
	SelectOptionProps,
} from '../../primitives/create-select-option'
import { createSelectOption } from '../../primitives/create-select-option'
import { useListboxContext } from './listbox'

export type ListboxOptionProps = SelectOptionProps

export type ListboxLabelProps = SelectLabelProps

export type ListboxDescriptionProps = SelectDescriptionProps

const { Option, Label, Description } = createSelectOption({
	slotPrefix: 'listbox',
	useContext: useListboxContext,
})

export { Option as ListboxOption, Label as ListboxLabel, Description as ListboxDescription }
