'use client'

import { DatePicker, type DatePickerRelativeValue } from 'ui/date-picker'
import { Filters, FiltersClear, FiltersField } from 'ui/filters'
import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'
import type { PlaceCategory } from '../../types'
import {
	hasActiveFilter,
	type PlaceFilterValue,
	type PlaceVisitFilter,
} from '../../utilities/places-filter'
import { CategoryPicker } from '../category-picker'

/** Props for {@link PlaceFilters}. */
export type PlaceFiltersProps = {
	value: PlaceFilterValue
	onValueChange: (value: PlaceFilterValue) => void
	/** Every region the drawn atlas holds, in the order the picker lists them. */
	regionNames: readonly string[]
	/** What the region picker calls itself, which follows the atlas the map draws. */
	regionLabel: string
	/** The region the map is projected into, or `null` for the whole atlas. */
	drilled: string | null
	/** Fires with the region to project, or `null` to go back out a level. */
	onDrill: (region: string | null) => void
}

/**
 * The bar over the map: which region to project, then which places to draw on it.
 *
 * The region picker is navigation and not a filter, so it sits beside the filter
 * bar rather than inside it — it does not narrow the places, it decides the
 * geography. It lists every region the drawn atlas holds, including the ones
 * holding nothing, because an empty region is still somewhere to look. It and
 * the breadcrumb read the same view, so clearing either is the way back.
 *
 * It also names itself for what it lists — countries on the world map, states
 * inside the United States — because the same control means a different grain at
 * each level and a fixed label would be wrong at one of them.
 *
 * Every filter goes through `FiltersField`'s render function rather than its
 * element form. The element form binds `value={fieldValue ?? null}`, and neither
 * a multi-select Listbox nor the relative DatePicker takes a `null` — each holds
 * an array. The render function hands the slot and its setter over untouched;
 * the casts are the `unknown` its props carry, which no form of this component
 * avoids.
 */
export function PlaceFilters({
	value,
	onValueChange,
	regionNames,
	regionLabel,
	drilled,
	onDrill,
}: PlaceFiltersProps) {
	return (
		// One row at every width, scrolling sideways where it does not fit. The map
		// under this bar is the whole screen, so a column of five controls would take
		// the thing the bar exists to filter — and on the narrow screen where that
		// column would appear, the map has the least room to spare.
		//
		// The bar's own padding rides inside the rail rather than on a wrapper around
		// it. Outside, that padded band is not the scroll container, so a wheel over
		// the strip above or below the controls — most of what the pointer can land
		// on — would reach nothing.
		<Filters<PlaceFilterValue>
			aria-label="Filter places"
			layout="rail"
			// The padding rides the rail, not the bar, so the whole padded band is
			// inside the scroll container — a wheel over the strip above or below the
			// controls scrolls, and so does the inset at either end.
			railClassName="px-6 py-3"
			value={value}
			onValueChange={onValueChange}
			// Only once something is set. A Clear standing over an unfiltered bar
			// offers to undo nothing, and reads as a control that does not work.
			//
			// It sits outside the rail: it clears every field, and an action on the
			// whole bar must not scroll away from the bar. Its own right inset matches
			// the rail's, so the bar reads as evenly set whether or not it is showing.
			clear={
				hasActiveFilter(value) ? (
					// The weight is this app's own: the bar sits over a map that redraws
					// under it, so the one control that undoes the lot has to be findable
					// at a glance. The shared default stays neutral for every other bar.
					<FiltersClear variant="soft" color="red" className="mr-6">
						Clear
					</FiltersClear>
				) : undefined
			}
		>
			{/* Navigation rather than a filter — it projects one region instead of
			    narrowing the places — but it rides the same rail: two scroll containers
			    side by side is one the reader's wheel finds and one it does not. */}
			<Listbox<string>
				aria-label={regionLabel}
				placeholder={regionLabel}
				clearable
				className="w-52 shrink-0"
				displayValue={(region) => region}
				value={drilled}
				onValueChange={onDrill}
			>
				{regionNames.map((region) => (
					<ListboxOption key={region} value={region}>
						<ListboxLabel>{region}</ListboxLabel>
					</ListboxOption>
				))}
			</Listbox>

			{/* A paint filter, not a place filter: it decides which regions carry the
				    visited fill and never which dots are drawn. Cleared, no region is
				    painted and the map reads as one surface with the places on it. */}
			<FiltersField name="visitedRegions" className="w-52">
				{({ value: picked, onValueChange: setPicked }) => (
					<Listbox<PlaceVisitFilter>
						aria-label="Visited"
						placeholder="Visited or not"
						clearable
						displayValue={(choice) => (choice === 'visited' ? 'Visited' : 'Not visited')}
						value={(picked as PlaceVisitFilter | undefined) ?? null}
						onValueChange={(next) => setPicked(next ?? undefined)}
					>
						<ListboxOption value="visited">
							<ListboxLabel>Visited</ListboxLabel>
						</ListboxOption>

						<ListboxOption value="unvisited">
							<ListboxLabel>Not visited</ListboxLabel>
						</ListboxOption>
					</Listbox>
				)}
			</FiltersField>

			<FiltersField name="categories" className="w-52">
				{({ value: categories, onValueChange: setCategories }) => (
					<CategoryPicker
						value={(categories as PlaceCategory[] | undefined) ?? []}
						// An absent field is what `Filters` reads as unset, and an empty
						// pick means the reader stopped filtering — so the two meet here.
						onValueChange={(next) => setCategories(next.length === 0 ? undefined : next)}
					/>
				)}
			</FiltersField>

			<FiltersField name="visited" className="w-52">
				{({ value: visited, onValueChange: setVisited }) => (
					<DatePicker
						// Text, not chips: the chip row wraps, so a filter bar reflows a
						// row taller as the reader selects. The summary holds the trigger
						// to the height of the Listbox beside it.
						relative={{ chips: false }}
						// The bar clears itself. A Clear inside the popover would undo one
						// field from inside a panel the reader opened to pick with, next to
						// a Clear on the bar that undoes every field — two controls of the
						// same name, one step apart, with different reach.
						footer={{ clear: false }}
						aria-label="Visited when"
						placeholder="Any time"
						value={(visited as DatePickerRelativeValue[] | undefined) ?? null}
						// Annotated: an object `relative` leaves the props union
						// unnarrowed, so the handler takes no contextual type.
						onValueChange={(next: DatePickerRelativeValue[] | null) =>
							setVisited(next ?? undefined)
						}
					/>
				)}
			</FiltersField>
		</Filters>
	)
}
