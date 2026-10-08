import { ListboxLabel, ListboxOption } from 'ui/listbox'
import { Swatch } from 'ui/swatch'
import { CATEGORIES, CATEGORY_BY_VALUE } from '../../constants'
import type { PlaceCategory, PlaceCategoryMeta } from '../../types'

/**
 * The swatch of a category in an option row. The row puts its children flush
 * against each other, so the swatch carries the gap to the name.
 */
function CategorySwatch({ category }: { category: PlaceCategoryMeta }) {
	return <Swatch shape="circle" color={category.color} className="mr-2" />
}

/**
 * The swatch of a category in the trigger, in a box with the geometry of a
 * prefix icon. Thus the name starts where the text of a field with a prefix
 * icon starts.
 *
 * Each value reads the step of the trigger. A prefix icon is one step smaller
 * than its trigger, so the width gives the icon size of the step below. The
 * end margin equals the inline padding of the trigger, which is the space
 * between a prefix icon and the text. The box is one line high and centers the
 * swatch, so the swatch and the text have the same middle.
 */
function CategoryValueSwatch({ category }: { category: PlaceCategoryMeta }) {
	return (
		<span className="inline-flex h-lh density-w-[3,4,5] density-me-ring-[2.5,3,3.5] items-center justify-center align-top">
			<Swatch shape="circle" color={category.color} />
		</span>
	)
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
			<CategoryValueSwatch category={category} />
			{category.label}
		</>
	)
}
