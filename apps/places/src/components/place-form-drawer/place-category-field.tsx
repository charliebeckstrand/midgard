'use client'

import { Field, Label, Message } from 'ui/fieldset'
import { Listbox } from 'ui/listbox'
import type { PlaceCategory } from '../../types'
import { CategoryOptions, categoryDisplayValue } from '../category-picker'

/**
 * The category of the place. Each option and the trigger carry the category
 * color, which is the color of the dot on the map. The options and the trigger
 * label come from the category picker, so the two category fields cannot drift.
 */
export function PlaceCategoryField() {
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
				displayValue={categoryDisplayValue}
			>
				<CategoryOptions />
			</Listbox>

			<Message name="category" />
		</Field>
	)
}
