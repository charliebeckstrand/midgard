'use client'

import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'
import { Swatch } from 'ui/swatch'
import { CATEGORIES, categoryLabel } from '../../constants'
import type { PlaceCategory } from '../../types'

/** Props for {@link CategoryPicker}. */
export type CategoryPickerProps = {
	/**
	 * The picked categories. An empty array is every category admitted, not none —
	 * see {@link CategoryPicker} for why the two are the same answer here.
	 */
	value: readonly PlaceCategory[]
	/** Fires with the picked categories, empty where the reader cleared them. */
	onValueChange: (categories: PlaceCategory[]) => void
	className?: string
}

/**
 * The category picker, wherever categories are narrowed — the bar over the map,
 * and the list inside a drawer.
 *
 * Each option carries its category's colour, which is the only key the map has:
 * the dots are painted by category and nothing else names those colours.
 *
 * An empty pick is not "admit nothing". A reader who clears the last category
 * means to stop filtering, so both callers read empty as unfiltered and the
 * component says so once here rather than at each of them.
 */
export function CategoryPicker({ value, onValueChange, className }: CategoryPickerProps) {
	return (
		<Listbox<PlaceCategory>
			multiple
			aria-label="Categories"
			placeholder="All categories"
			clearable
			className={className}
			displayValue={categoryLabel}
			value={[...value]}
			onValueChange={onValueChange}
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
	)
}
