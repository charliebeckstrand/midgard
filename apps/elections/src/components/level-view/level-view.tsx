'use client'

import { useState } from 'react'
import { Calendar } from 'ui/calendar'
import {
	FormFilters,
	FormFiltersBar,
	FormFiltersClear,
	FormFiltersField,
	FormFiltersRow,
} from 'ui/form'
import { Heading } from 'ui/heading'
import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'
import { Segment, SegmentControl, SegmentItem } from 'ui/segment'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'
import type { Election } from '../../elections/registry'
import {
	filterElections,
	isoDay,
	type LevelFilterOption,
	type LevelFilterValue,
	levelFilterOptions,
	localDay,
	openingDay,
	statusGroups,
} from '../../utilities/levels'
import { ElectionList, electionDay } from '../election-list'

/** The views of a level page. */
type LevelViewKind = 'list' | 'calendar'

/** The label of each filter, which is also its placeholder. */
const FILTER_LABELS: Record<keyof LevelFilterValue, string> = {
	year: 'Year',
	country: 'Country',
	office: 'Office',
}

/** One filter of the bar: a Listbox of its options, which clears to no filter. */
function FilterField({
	name,
	options,
}: {
	name: keyof LevelFilterValue
	options: readonly LevelFilterOption[]
}) {
	const label = FILTER_LABELS[name]

	return (
		<FormFiltersField<string> name={name} className="w-40">
			{({ value, onValueChange }) => (
				<Listbox<string>
					aria-label={label}
					placeholder={label}
					clearable
					displayValue={(picked) => options.find((option) => option.value === picked)?.label ?? ''}
					value={value ?? null}
					onValueChange={(next) => onValueChange(next ?? undefined)}
				>
					{options.map((option) => (
						<ListboxOption key={option.value} value={option.value}>
							<ListboxLabel>{option.label}</ListboxLabel>
						</ListboxOption>
					))}
				</Listbox>
			)}
		</FormFiltersField>
	)
}

/** The list view: the elections in groups of their status. */
function ListView({ elections }: { elections: readonly Election[] }) {
	return statusGroups(elections).map((group) => (
		<section key={group.status}>
			<Stack gap="sm">
				<Heading level={2}>{group.heading}</Heading>

				<ElectionList elections={group.elections} />
			</Stack>
		</section>
	))
}

/**
 * The calendar view: a month with each election day marked, and under it the
 * elections of the picked day. A day with no election picks nothing.
 */
function CalendarView({ elections }: { elections: readonly Election[] }) {
	const opening = openingDay(elections)

	const [picked, setPicked] = useState(opening)

	const days = new Set(elections.map((election) => election.date))

	const shown = elections.filter((election) => election.date === picked)

	return (
		<Stack gap="lg">
			<Calendar
				value={picked === null ? null : localDay(picked)}
				onDayPress={(day) => {
					if (days.has(isoDay(day))) setPicked(isoDay(day))
				}}
				getDayProps={({ date, selected }) =>
					days.has(isoDay(date)) && !selected
						? { variant: 'soft', color: 'blue' }
						: { className: selected ? undefined : 'text-zinc-400 dark:text-zinc-500' }
				}
				className="w-fit"
			/>

			{picked === null || shown.length === 0 ? null : (
				<section>
					<Stack gap="sm">
						<Heading level={2}>{electionDay(picked)}</Heading>

						<ElectionList elections={shown} />
					</Stack>
				</section>
			)}
		</Stack>
	)
}

/**
 * The body of a level page: the compilation of the elections of its scope.
 * The bar on top switches the view and filters the elections. Each level page
 * has the same bar, and a filter shows only where it has two options or more.
 *
 * - List: the elections counted now, then those to come, then the past ones.
 * - Calendar: the month of the first of them, with each election day marked.
 */
export function LevelView({ elections }: { elections: readonly Election[] }) {
	const [view, setView] = useState<LevelViewKind>('list')

	const [filter, setFilter] = useState<LevelFilterValue>({})

	const options = levelFilterOptions(elections)

	const fields = (Object.keys(FILTER_LABELS) as (keyof LevelFilterValue)[]).filter(
		(name) => options[name].length > 1,
	)

	const shown = filterElections(elections, filter)

	return (
		<>
			<Flex justify="between" align="center" gap="md" wrap>
				<Segment value={view} onValueChange={(next) => setView(next as LevelViewKind)}>
					<SegmentControl aria-label="View">
						<SegmentItem value="list">List</SegmentItem>
						<SegmentItem value="calendar">Calendar</SegmentItem>
					</SegmentControl>
				</Segment>

				{fields.length === 0 ? null : (
					<FormFilters<LevelFilterValue>
						aria-label="Filter elections"
						layout="rail"
						value={filter}
						onValueChange={setFilter}
						className="max-w-full"
					>
						<FormFiltersBar>
							<FormFiltersRow>
								{fields.map((name) => (
									<FilterField key={name} name={name} options={options[name]} />
								))}
							</FormFiltersRow>

							<FormFiltersClear>Clear</FormFiltersClear>
						</FormFiltersBar>
					</FormFilters>
				)}
			</Flex>

			{view === 'list' ? (
				<ListView elections={shown} />
			) : (
				// A new filter opens the calendar again on its first election.
				<CalendarView key={shown.map((election) => election.date).join()} elections={shown} />
			)}
		</>
	)
}
