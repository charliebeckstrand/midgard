'use client'

import dynamic from 'next/dynamic'
import { ControlSkeleton } from 'ui/control'
import type { DatePickerRelativeValue } from 'ui/date-picker'
import { Filters, FiltersBar, FiltersClear, FiltersField, FiltersRow } from 'ui/filters'
import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'
import { Swatch } from 'ui/swatch'
import { RECORD_KIND_META } from '../../constants'
import { flags } from '../../flags'
import { type PlaceCategory, RECORD_KINDS, type RecordKind } from '../../types'
import {
	hasActiveFilter,
	type PlaceFilterValue,
	type PlaceVisitFilter,
} from '../../utilities/places-filter'
import { CategoryPicker } from '../category-picker'

/**
 * The date picker of the Visited field. It carries the calendar and the relative
 * presets, which a reader opens after the map, if at all, so the page does not
 * wait for its code. The form drawer uses the same picker, so the two share one
 * chunk. The `loading` control holds the width and height of the field until the
 * code of the picker loads.
 */
const DatePicker = dynamic(() => import('ui/date-picker').then((module) => module.DatePicker), {
	loading: () => <ControlSkeleton />,
})

/** Props for {@link PlaceFilters}. */
export type PlaceFiltersProps = {
	value: PlaceFilterValue
	onValueChange: (value: PlaceFilterValue) => void
	/** The regions the picker lists, in order. */
	regionNames: readonly string[]
	/** What the region picker calls itself, which follows the atlas the map draws. */
	regionLabel: string
	/** The region the map is projected into, or `null` for the whole atlas. */
	drilled: string | null
	/** Fires with the region to project, or `null` to go back out a level. */
	onDrill: (region: string | null) => void
	/** Whether the reader has a trip, which is when the Show field shows. */
	hasTrips: boolean
}

/** The name of a kind, which is what the trigger of the Show field shows. */
function kindLabel(kind: RecordKind): string {
	return RECORD_KIND_META[kind].label
}

/**
 * Which kinds of record the map draws. Each option carries a swatch in the
 * shape and the color of the mark of its kind, which is the only key the map
 * has for the two shapes.
 *
 * Both kinds are picked while the field is unset, so the reader sees the
 * default they are on. An empty pick returns to both, the same rule the
 * category picker keeps: a reader who clears the last kind means to stop
 * filtering, not to empty the map.
 */
function ShowField() {
	return (
		<FiltersField<RecordKind[]> name="show" className="w-52">
			{({ value: kinds, onValueChange: setKinds }) => (
				<Listbox<RecordKind>
					multiple
					aria-label="Show"
					placeholder="Places and trips"
					displayValue={kindLabel}
					value={kinds ?? [...RECORD_KINDS]}
					onValueChange={(next) =>
						setKinds(next.length === 0 || next.length === RECORD_KINDS.length ? undefined : next)
					}
				>
					{RECORD_KINDS.map((kind) => (
						<ListboxOption key={kind} value={kind}>
							{/* The row puts its children flush, so the swatch carries the gap. */}
							<Swatch
								shape={RECORD_KIND_META[kind].shape}
								color={RECORD_KIND_META[kind].color}
								className="mr-2"
							/>

							<ListboxLabel>{kindLabel(kind)}</ListboxLabel>
						</ListboxOption>
					))}
				</Listbox>
			)}
		</FiltersField>
	)
}

/**
 * The bar over the map: which region to project, then which places to draw on it.
 *
 * The region picker is navigation and not a filter, so it sits beside the filter
 * bar rather than inside it — it does not narrow the places, it decides the
 * geography. It lists the regions it is given: on the world map, the countries
 * that hold a place, because the palette reaches the rest. It and the
 * breadcrumb read the same view, so clearing either is the way back.
 *
 * It also names itself for what it lists — countries on the world map, states
 * inside the United States — because the same control means a different grain at
 * each level and a fixed label would be wrong at one of them.
 *
 * Every filter goes through `FiltersField`'s render function rather than its
 * element form. The element form binds `value={fieldValue ?? null}`, and neither
 * a multi-select Listbox nor the relative DatePicker takes a `null` — each holds
 * an array. The render function hands the slot and its setter over untouched.
 * Each field names the type of its slot, so the render function needs no cast.
 */
export function PlaceFilters({
	value,
	onValueChange,
	regionNames,
	regionLabel,
	drilled,
	onDrill,
	hasTrips,
}: PlaceFiltersProps) {
	return (
		// One row at every width, scrolling sideways where it does not fit. The map
		// under this bar is the whole screen, so a column of five controls would take
		// the thing the bar exists to filter — and on the narrow screen where that
		// column would appear, the map has the least room to spare.
		<Filters<PlaceFilterValue>
			aria-label="Filter places"
			layout="rail"
			value={value}
			onValueChange={onValueChange}
		>
			<FiltersBar>
				{/* The bar's own padding rides the field row rather than a wrapper
				    around it. Outside the row, a padded band is not the scroll
				    container. A wheel over the strip above or below the controls —
				    most of what the pointer can land on — would reach nothing.

				    While Clear follows the row, the row has no right padding. Clear
				    holds the inset at the right edge, and the gap of the bar holds
				    the space between the two. With the padding too, the last field
				    stood four gaps away from Clear. */}
				<FiltersRow className="px-6 py-3 not-last:pr-0">
					{/* Navigation rather than a filter — it projects one region instead of
					    narrowing the places — but it rides the same rail: two scroll
					    containers side by side is one the reader's wheel finds and one it
					    does not. */}
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

					{/* Only while the reader has a trip: with places alone there is
					    nothing to choose between. */}
					{hasTrips ? <ShowField /> : null}

					{/* A paint filter, not a place filter: it decides which regions carry the
					    visited fill and never which dots are drawn. Cleared, no region is
					    painted and the map reads as one surface with the places on it. It
					    shows only while the visited regions feature is on. */}
					{flags.visitedRegions ? (
						<FiltersField<PlaceVisitFilter> name="visitedRegions" className="w-52">
							{({ value: picked, onValueChange: setPicked }) => (
								<Listbox<PlaceVisitFilter>
									aria-label="Visited"
									placeholder="Visited or not"
									clearable
									displayValue={(choice) => (choice === 'visited' ? 'Visited' : 'Not visited')}
									value={picked ?? null}
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
					) : null}

					<FiltersField<PlaceCategory[]> name="categories" className="w-52">
						{({ value: categories, onValueChange: setCategories }) => (
							<CategoryPicker
								value={categories ?? []}
								// An absent field is what `Filters` reads as unset, and an empty
								// pick means the reader stopped filtering — so the two meet here.
								onValueChange={(next) => setCategories(next.length === 0 ? undefined : next)}
							/>
						)}
					</FiltersField>

					<FiltersField<DatePickerRelativeValue[]> name="visited" className="w-52">
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
								// The trigger is as wide as its content. Fill the field, as the
								// Listbox beside it does.
								className="w-full"
								value={visited ?? null}
								// Annotated: an object `relative` leaves the props union
								// unnarrowed, so the handler takes no contextual type.
								onValueChange={(next: DatePickerRelativeValue[] | null) =>
									setVisited(next ?? undefined)
								}
							/>
						)}
					</FiltersField>
				</FiltersRow>

				{/* Only once something is set. A Clear standing over an unfiltered bar
				    offers to undo nothing, and reads as a control that does not work.

				    It sits outside the row: it clears every field, and an action on the
				    whole bar must not scroll away from the bar. Its margin matches the
				    padding of the row. The bar lines up its regions on their bottom
				    edges, and the bottom edge of the row is its padding, not its
				    controls. Without the same inset, Clear sits lower than the
				    controls. */}
				{hasActiveFilter(value) && (
					// The weight is this app's own: the bar sits over a map that redraws
					// under it, so the one control that undoes the lot has to be findable
					// at a glance. The shared default stays neutral for every other bar.
					<FiltersClear variant="soft" color="red" className="my-3 mr-6">
						Clear
					</FiltersClear>
				)}
			</FiltersBar>
		</Filters>
	)
}
