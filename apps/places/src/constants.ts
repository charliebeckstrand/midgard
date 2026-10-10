import type { PlaceCategory, PlaceCategoryMeta, PlaceColor, RecordKind } from './types'

/**
 * The categories, in the order the filter lists them and the map assigns their
 * colors. Each carries its own slot, so a category keeps its color whatever
 * else is on the map — a legend that renumbered itself as places were added
 * would make yesterday's screenshot lie.
 */
export const CATEGORIES: readonly PlaceCategoryMeta[] = [
	{ value: 'food', label: 'Food', color: 'blue' },
	{ value: 'entertainment', label: 'Entertainment', color: 'violet' },
	{ value: 'nature', label: 'Nature', color: 'green' },
	{ value: 'shopping', label: 'Shopping', color: 'rose' },
	{ value: 'other', label: 'Other', color: 'zinc' },
]

/** The categories by value, for the readouts that hold one and need its name. */
export const CATEGORY_BY_VALUE = new Map<PlaceCategory, PlaceCategoryMeta>(
	CATEGORIES.map((category) => [category.value, category]),
)

/** Every category value, which is what an unfiltered map draws. */
export const CATEGORY_VALUES: readonly PlaceCategory[] = CATEGORIES.map(
	(category) => category.value,
)

/**
 * A category's name. Every Listbox over categories takes this as its
 * `displayValue`: the trigger renders nothing without one, so the field would
 * read as unset while holding a value.
 */
export function categoryLabel(value: PlaceCategory): string {
	return CATEGORY_BY_VALUE.get(value)?.label ?? value
}

/** The highest score a place can carry, and the number of stars that shows it. */
export const MAX_RATING = 5

/**
 * What each kind of record looks like: its name, the shape of its mark on the
 * map, and the color of that mark. The map, the Show filter, and the palette
 * read the shape and the color here, so the swatch of a kind is always the mark
 * it names. Amber is for trips because no category uses it.
 */
export const RECORD_KIND_META: Readonly<
	Record<RecordKind, { label: string; shape: 'circle' | 'square'; color: PlaceColor }>
> = {
	places: { label: 'Places', shape: 'circle', color: 'blue' },
	trips: { label: 'Trips', shape: 'square', color: 'amber' },
}
