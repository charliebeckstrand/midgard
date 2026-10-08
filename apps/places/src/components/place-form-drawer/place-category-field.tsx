'use client'

import { Field, Label, Message } from 'ui/fieldset'
import { useFormValue } from 'ui/form'
import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'
import { Swatch } from 'ui/swatch'
import { CATEGORIES, CATEGORY_BY_VALUE, categoryLabel } from '../../constants'
import type { PlaceCategory } from '../../types'

/**
 * The category of the place. Each option and the trigger carry the category
 * color, which is the color of the dot on the map.
 *
 * The `displayValue` of the Listbox gives only text, so the trigger shows the
 * swatch as its prefix. The field reads the form value to find that color.
 */
export function PlaceCategoryField() {
	const { value } = useFormValue<PlaceCategory>('category', {})

	const selected = value === undefined ? undefined : CATEGORY_BY_VALUE.get(value)

	return (
		<Field>
			<Label>Category</Label>

			{/* Clearable, because a reader who picked the wrong one otherwise has
			    no way back to having picked nothing. Category is required, so
			    clearing surfaces the field's own message on submit rather than
			    writing a place without one. */}
			<Listbox<PlaceCategory>
				name="category"
				placeholder="Pick a category"
				clearable
				displayValue={categoryLabel}
				prefix={selected ? <Swatch shape="circle" color={selected.color} /> : undefined}
			>
				{CATEGORIES.map((category) => (
					<ListboxOption key={category.value} value={category.value}>
						{/* The option row lays its children out flush, so the swatch carries
						    its own gap. */}
						<Swatch shape="circle" color={category.color} className="mr-2" />

						<ListboxLabel>{category.label}</ListboxLabel>
					</ListboxOption>
				))}
			</Listbox>

			<Message name="category" />
		</Field>
	)
}
