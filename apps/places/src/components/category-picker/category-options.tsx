import { ListboxLabel, ListboxOption } from 'ui/listbox'
import { Swatch } from 'ui/swatch'
import { CATEGORIES, CATEGORY_BY_VALUE } from '../../constants'
import type { PlaceCategory, PlaceCategoryMeta } from '../../types'

/**
 * The swatch of a category, with the gap to the name after it. The option row
 * and the trigger both put the swatch flush against the name, so the swatch
 * carries the gap. The `align-middle` centers the swatch on the line of text in
 * the trigger.
 */
function CategorySwatch({ category }: { category: PlaceCategoryMeta }) {
	return <Swatch shape="circle" color={category.color} className="mr-2 align-middle" />
}

/**
 * The options of each category Listbox. Each option carries the color of its
 * category, which is the color of the dot on the map.
 */
export function CategoryOptions() {
	return CATEGORIES.map((category) => (
		<ListboxOption key={category.value} value={category.value}>
			<CategorySwatch category={category} />

			<ListboxLabel>{category.label}</ListboxLabel>
		</ListboxOption>
	))
}

/**
 * The `displayValue` of each category Listbox: the swatch and the name, as the
 * option shows them. A value that the app does not know shows as it is stored.
 */
export function categoryDisplayValue(value: PlaceCategory) {
	const category = CATEGORY_BY_VALUE.get(value)

	if (!category) return value

	return (
		<>
			<CategorySwatch category={category} />
			{category.label}
		</>
	)
}
