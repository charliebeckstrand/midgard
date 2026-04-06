'use client'

import type {
	SelectDescriptionProps,
	SelectLabelProps,
	SelectOptionProps,
} from '../../primitives/create-select-option'
import { createSelectOption } from '../../primitives/create-select-option'
import { useSelectContext } from './component'

export type SelectOptionComponentProps = SelectOptionProps

export type SelectLabelComponentProps = SelectLabelProps

export type SelectDescriptionComponentProps = SelectDescriptionProps

const { Option, Label, Description } = createSelectOption({
	slotPrefix: 'select',
	useContext: useSelectContext,
})

export { Option as SelectOption, Label as SelectLabel, Description as SelectDescription }
