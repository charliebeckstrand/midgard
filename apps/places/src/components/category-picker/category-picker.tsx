'use client'

import type { ReactNode } from 'react'
import { Listbox } from 'ui/listbox'
import type { PlaceCategory } from '../../types'
import { CategoryOptions, categoryDisplayValue } from './category-options'

/** Props for {@link CategoryPicker}. */
export type CategoryPickerProps = {
	/**
	 * The picked categories. An empty array is every category admitted, not none —
	 * see {@link CategoryPicker} for why the two are the same answer here.
	 */
	value: readonly PlaceCategory[]
	/** Fires with the picked categories, empty where the reader cleared them. */
	onValueChange: (categories: PlaceCategory[]) => void
	/** The prefix of the trigger, such as an icon that names the field. */
	prefix?: ReactNode
	className?: string
}

/**
 * The category picker, wherever categories are narrowed — the bar over the map,
 * and the list inside a drawer.
 *
 * Each option and each selected value carries its category's color, which is
 * the only key the map has: the dots are painted by category and nothing else
 * names those colors.
 *
 * An empty pick is not "admit nothing". A reader who clears the last category
 * means to stop filtering, so both callers read empty as unfiltered and the
 * component says so once here rather than at each of them.
 */
export function CategoryPicker({ value, onValueChange, prefix, className }: CategoryPickerProps) {
	return (
		<Listbox<PlaceCategory>
			multiple
			aria-label="Categories"
			placeholder="All categories"
			clearable
			prefix={prefix}
			className={className}
			displayValue={categoryDisplayValue}
			value={[...value]}
			onValueChange={onValueChange}
		>
			<CategoryOptions />
		</Listbox>
	)
}
