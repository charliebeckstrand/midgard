'use client'

import type {
	SelectDescriptionProps,
	SelectLabelProps,
	SelectOptionProps,
} from '../../primitives/select-option'
import { createSelectOption } from '../../primitives/select-option'
import { useListboxContext } from './listbox'

export type ListboxOptionProps = SelectOptionProps

export type ListboxLabelProps = SelectLabelProps

export type ListboxDescriptionProps = SelectDescriptionProps

const { Option, Label, Description } = createSelectOption({
	slotPrefix: 'listbox',
	useContext: useListboxContext,
})

export { Description as ListboxDescription, Label as ListboxLabel, Option as ListboxOption }
