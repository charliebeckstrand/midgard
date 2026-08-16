'use client'

import { Heart } from 'lucide-react'
import { Button } from 'ui/button'
import { Filters, FiltersClear, FiltersField } from 'ui/filters'
import { Icon } from 'ui/icon'
import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'
import { SearchInput } from 'ui/search-input'
import { LABELS, labelName } from '../../constants'
import type { RecipeLabel, RecipeSort } from '../../types'
import { hasActiveFilter, type RecipeFilterValue } from '../../utilities/recipes-filter'

/** Props for {@link RecipeFilters}. */
export type RecipeFiltersProps = {
	value: RecipeFilterValue
	onValueChange: (value: RecipeFilterValue) => void
	sort: RecipeSort
	onSortChange: (sort: RecipeSort) => void
}

/** What each order calls itself, in the order the picker lists them. */
const SORTS: readonly { value: RecipeSort; label: string }[] = [
	{ value: 'manual', label: 'My order' },
	{ value: 'name', label: 'Name' },
	{ value: 'most-cooked', label: 'Most cooked' },
	{ value: 'recently-cooked', label: 'Recently cooked' },
]

/** An order's name, which the picker's trigger renders nothing without. */
function sortName(value: RecipeSort): string {
	return SORTS.find((sort) => sort.value === value)?.label ?? value
}

/**
 * The bar over the list: what order to read it in, then which recipes to draw.
 *
 * The order picker is not a filter — it narrows nothing — so it sits beside the
 * filter fields rather than inside them, and the Clear does not reach it. It
 * rides the same rail all the same: two scroll containers side by side is one
 * the reader's wheel finds and one it does not.
 *
 * Every filter goes through `FiltersField`'s render function rather than its
 * element form, because the element form binds `value={fieldValue ?? null}` and
 * none of these three controls takes a `null` — the multi-select holds an array,
 * and the other two hold their own state. The render function hands the slot and
 * its setter over untouched; the casts are the `unknown` its props carry, which
 * no form of this component avoids.
 */
export function RecipeFilters({ value, onValueChange, sort, onSortChange }: RecipeFiltersProps) {
	return (
		// One row at every width, scrolling sideways where it does not fit. A column
		// of four controls would push the list itself below the fold on the narrow
		// screen where the list has the least room to spare.
		<Filters<RecipeFilterValue>
			aria-label="Filter recipes"
			layout="rail"
			railClassName="px-6 py-3"
			value={value}
			onValueChange={onValueChange}
			// Only once something is set. A Clear standing over an unfiltered bar
			// offers to undo nothing, and reads as a control that does not work.
			//
			// It sits outside the rail: it clears every field, and an action on the
			// whole bar must not scroll away from the bar.
			clear={
				hasActiveFilter(value) ? (
					<FiltersClear variant="soft" color="red" className="mr-6">
						Clear
					</FiltersClear>
				) : undefined
			}
		>
			<FiltersField name="search" className="w-64">
				{({ value: search, onValueChange: setSearch }) => (
					<SearchInput
						aria-label="Search recipes"
						placeholder="Name or ingredient"
						value={(search as string | undefined) ?? ''}
						// An absent field is what `Filters` reads as unset, and an empty
						// box means the reader stopped searching — so the two meet here.
						onValueChange={(next) => setSearch(next.trim() === '' ? undefined : next)}
					/>
				)}
			</FiltersField>

			<FiltersField name="labels" className="w-52">
				{({ value: labels, onValueChange: setLabels }) => (
					<Listbox<RecipeLabel>
						multiple
						aria-label="Labels"
						placeholder="Any label"
						clearable
						displayValue={labelName}
						value={(labels as RecipeLabel[] | undefined) ?? []}
						onValueChange={(next) => setLabels(next.length === 0 ? undefined : next)}
					>
						{LABELS.map((label) => (
							<ListboxOption key={label.value} value={label.value}>
								<ListboxLabel>{label.label}</ListboxLabel>
							</ListboxOption>
						))}
					</Listbox>
				)}
			</FiltersField>

			<FiltersField name="favorite" className="shrink-0">
				{({ value: favorite, onValueChange: setFavorite }) => (
					// A button rather than a switch. The bar is a row of controls the
					// reader scans sideways, and a switch needs a label beside it — which
					// is two boxes and a gap where every neighbour is one box. The button
					// carries its own state in its fill, and says what it is in its text.
					<Button
						variant={favorite === true ? 'soft' : 'plain'}
						color={favorite === true ? 'red' : undefined}
						prefix={
							<Icon icon={<Heart />} className={favorite === true ? 'fill-current' : undefined} />
						}
						aria-pressed={favorite === true}
						// `true` or absent, never `false`: the bar has two states here and
						// not three, and a stored `false` would raise the Clear over a bar
						// that narrows nothing.
						onClick={() => setFavorite(favorite === true ? undefined : true)}
					>
						Favourites
					</Button>
				)}
			</FiltersField>

			{/* An order rather than a filter, so it is outside every field and the
			    Clear leaves it alone: a reader who clears the bar wants the whole list
			    back, not the whole list in a different order. */}
			<Listbox<RecipeSort>
				aria-label="Order"
				className="w-48 shrink-0"
				displayValue={sortName}
				value={sort}
				onValueChange={(next) => onSortChange(next ?? 'manual')}
			>
				{SORTS.map((option) => (
					<ListboxOption key={option.value} value={option.value}>
						<ListboxLabel>{option.label}</ListboxLabel>
					</ListboxOption>
				))}
			</Listbox>
		</Filters>
	)
}
