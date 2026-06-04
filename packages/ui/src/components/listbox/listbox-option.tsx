'use client'

import type { OptionDescriptionProps, OptionLabelProps, OptionProps } from '../../primitives/option'
import { createSelectOption } from '../../primitives/option'
import { useListboxContext } from './context'

export type ListboxOptionProps = OptionProps

export type ListboxLabelProps = OptionLabelProps

export type ListboxDescriptionProps = OptionDescriptionProps

const { Option, Label, Description } = createSelectOption({
	slotPrefix: 'listbox',
	useContext: useListboxContext,
})

export { Description as ListboxDescription, Label as ListboxLabel, Option as ListboxOption }
