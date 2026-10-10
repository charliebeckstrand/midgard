'use client'

import { Plus, Trash } from 'lucide-react'
import { useId, useMemo } from 'react'
import { AddressInput, type AddressProvider, type AddressSuggestion } from 'ui/address-input'
import { Button } from 'ui/button'
import { Card } from 'ui/card'
import { Control } from 'ui/control'
import { DatePicker } from 'ui/date-picker'
import { Field, Label, Message } from 'ui/fieldset'
import { useFormValue } from 'ui/form'
import { Icon } from 'ui/icon'
import { List, ListItem } from 'ui/list'
import { Listbox } from 'ui/listbox'
import { Columns } from 'ui/structure/columns'
import { Flex } from 'ui/structure/flex'
import { ToggleIconButton } from 'ui/toggle-icon-button'
import type { Place, PlaceCategory } from '../../types'
import { foldText } from '../../utilities/places-palette'
import { CategoryOptions, categoryDisplayValue } from '../category-picker'
import { recordMatch } from './location-form'
import { placeGeocoder } from './place-geocoder'
import { type StopRow, stopRow } from './trip-form'

/** How many places on record lead the matches of a row. */
const SAVED_MATCHES = 5

/** A place on record as a match of the search, with its name folded for the search. */
type SavedMatch = { match: AddressSuggestion; folded: string }

/**
 * A place on record as a match of the search, so a row can visit it again. It
 * shows the name of the place, and its address under the name.
 */
function savedMatch(place: Place): SavedMatch {
	return {
		match: { ...recordMatch(place), label: place.name, description: place.address },
		folded: foldText(place.name),
	}
}

/**
 * The search of a row: the places on record whose name holds the query, then
 * the geocoder. A place the reader has been to is the likely answer, and a
 * pick of one visits it again rather than adding it twice.
 */
function stopProvider(saved: readonly SavedMatch[]): AddressProvider {
	return async (query, options) => {
		const folded = foldText(query)

		const mine: AddressSuggestion[] = []

		for (const held of saved) {
			if (mine.length === SAVED_MATCHES) break

			if (held.folded.includes(folded)) mine.push(held.match)
		}

		return [...mine, ...(await placeGeocoder(query, options))]
	}
}

/**
 * The places of a new trip: one row per place, each with a search, a category
 * where the match is a new place, and a day. The calendar of a row offers the
 * days of the trip, and a new row starts on its first day. Rating, review, and
 * photos are added per visit afterwards.
 *
 * The field holds no row at first, because a trip can start before its places.
 * A row holds up to three controls, so each row is an outlined card: the space
 * between two rows is then not the only mark of where a row ends.
 */
export function TripStopsField({ places }: { places: readonly Place[] }) {
	const { value: rows = [], setValue } = useFormValue<StopRow[]>('stops', {})

	const { value: days } = useFormValue<[Date, Date]>('days', {})

	const id = useId()

	// The places on record as matches. Held, so a match keeps its identity while
	// the reader types, and a pick is known as a place on record by that identity.
	// A match of a place on record wears the id of the place.
	const saved = useMemo(() => places.map(savedMatch), [places])

	const savedMatches = useMemo(() => new Set(saved.map((held) => held.match)), [saved])

	const provider = useMemo(() => stopProvider(saved), [saved])

	const write = (key: string, change: Partial<StopRow>) =>
		setValue(rows.map((row) => (row.key === key ? { ...row, ...change } : row)))

	return (
		<Field htmlFor={`${id}list`}>
			<Label as="span" id={`${id}label`}>
				Places
			</Label>

			{rows.length === 0 ? null : (
				<List
					id={`${id}list`}
					items={rows}
					getKey={(row) => row.key}
					sortable={false}
					variant="bare"
					aria-labelledby={`${id}label`}
				>
					{(row) => {
						const n = rows.indexOf(row) + 1

						return (
							<ListItem>
								{/* An outlined card per row, with no fill, so each row reads as
								    one group without a tint behind its controls. Each control is
								    in a Control of its own, so each takes an id of its own rather
								    than the id of the Field. The search takes the row; the
								    category of a new place and the day share the line under it.
								    A place on record keeps its own category. */}
								<Card className="w-full">
									<Flex gap="sm" align="center">
										<Columns
											columns={{ initial: 1, sm: 2 }}
											gap="sm"
											align="start"
											className="min-w-0 flex-1"
										>
											<Control className="sm:col-span-2">
												<AddressInput
													aria-label={`Place ${n}`}
													placeholder="Search for a place"
													provider={provider}
													value={row.match ?? null}
													onValueChange={(match) =>
														write(row.key, {
															match: match ?? undefined,
															placeId:
																match !== null && savedMatches.has(match) ? match.id : undefined,
														})
													}
												/>
											</Control>

											{row.match !== undefined && row.placeId === undefined ? (
												<Control>
													<Listbox<PlaceCategory>
														aria-label={`Category of place ${n}`}
														placeholder="Pick a category"
														displayValue={categoryDisplayValue}
														value={row.category ?? null}
														onValueChange={(category) =>
															write(row.key, { category: category ?? undefined })
														}
													>
														<CategoryOptions />
													</Listbox>
												</Control>
											) : null}

											<Control>
												<DatePicker
													aria-label={`Day of place ${n}`}
													min={days?.[0]}
													max={days?.[1]}
													className="w-full"
													value={row.day ?? null}
													onValueChange={(day: Date | null) =>
														write(row.key, { day: day ?? undefined })
													}
												/>
											</Control>
										</Columns>

										<ToggleIconButton
											icon={<Icon icon={<Trash />} />}
											aria-label={`Remove place ${n}`}
											onClick={() => setValue(rows.filter((held) => held.key !== row.key))}
										/>
									</Flex>
								</Card>
							</ListItem>
						)
					}}
				</List>
			)}

			<Button
				type="button"
				variant="plain"
				prefix={<Icon icon={<Plus />} />}
				onClick={() => setValue([...rows, stopRow(days?.[0])])}
			>
				Add place
			</Button>

			<Message name="stops" />
		</Field>
	)
}
