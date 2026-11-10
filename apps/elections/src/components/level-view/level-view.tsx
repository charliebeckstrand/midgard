'use client'

import { ListFilter } from 'lucide-react'
import { useState } from 'react'
import { Badge } from 'ui/badge'
import { Button } from 'ui/button'
import { Calendar } from 'ui/calendar'
import {
	Dialog,
	DialogBody,
	DialogClose,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogTitle,
} from 'ui/dialog'
import { Field, Label } from 'ui/fieldset'
import { Form, FormSubmit } from 'ui/form'
import { Heading } from 'ui/heading'
import { Icon } from 'ui/icon'
import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'
import { Segment, SegmentControl, SegmentItem } from 'ui/segment'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'
import type { Election } from '../../elections/registry'
import {
	activeFilters,
	filterElections,
	isoDay,
	type LevelFilterOptions,
	type LevelFilterValue,
	levelFilterOptions,
	localDay,
	NO_FILTER,
	openingDay,
	statusGroups,
} from '../../utilities/levels'
import { type CountryFlags, ElectionDay, ElectionList } from '../election-list'

/** The views of a level page. */
type LevelViewKind = 'list' | 'calendar'

/** The label of each filter, in the order of the form. */
const FILTER_LABELS: Record<keyof LevelFilterValue, string> = {
	year: 'Year',
	country: 'Country',
}

/** The list view: the elections in groups of their status. */
function ListView({ elections, flags }: { elections: readonly Election[]; flags: CountryFlags }) {
	return statusGroups(elections).map((group) => (
		<section key={group.status}>
			<Stack gap="sm">
				<Heading level={2}>{group.heading}</Heading>

				<ElectionList elections={group.elections} flags={flags} />
			</Stack>
		</section>
	))
}

/**
 * The calendar view: a month with each election day marked, and under it the
 * elections of the picked day. A day with no election picks nothing.
 */
function CalendarView({
	elections,
	flags,
}: {
	elections: readonly Election[]
	flags: CountryFlags
}) {
	const [picked, setPicked] = useState(() => openingDay(elections))

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
						<Heading level={2}>
							<ElectionDay date={picked} />
						</Heading>

						<ElectionList elections={shown} flags={flags} />
					</Stack>
				</section>
			)}
		</Stack>
	)
}

/**
 * The filter of a level page: a button that opens a dialog with a form of each
 * filter that has two options or more. Apply sets the filter, and Clear sets
 * no filter. The button counts the filters that are set.
 */
function LevelFilter({
	options,
	value,
	onValueChange,
}: {
	options: LevelFilterOptions
	value: LevelFilterValue
	onValueChange: (value: LevelFilterValue) => void
}) {
	const [open, setOpen] = useState(false)

	const fields = (Object.keys(FILTER_LABELS) as (keyof LevelFilterValue)[]).filter(
		(name) => options[name].length > 1,
	)

	const count = activeFilters(value)

	const apply = (next: LevelFilterValue) => {
		onValueChange(next)

		setOpen(false)
	}

	return (
		<>
			<Button variant="plain" onClick={() => setOpen(true)}>
				<Icon icon={<ListFilter />} />
				Filter
				{count === 0 ? null : (
					<Badge variant="soft" color="blue">
						{count}
					</Badge>
				)}
			</Button>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogPanel width="sm" glass>
					<DialogHeader>
						<DialogTitle>Filter elections</DialogTitle>
					</DialogHeader>

					<Form<LevelFilterValue> defaultValues={value} onSubmit={apply}>
						<DialogBody>
							<Stack gap="lg">
								{fields.map((name) => (
									<Field key={name}>
										<Label>{FILTER_LABELS[name]}</Label>

										<Listbox<string>
											name={name}
											placeholder="Any"
											clearable
											displayValue={(picked) =>
												options[name].find((option) => option.value === picked)?.label ?? ''
											}
										>
											{options[name].map((option) => (
												<ListboxOption key={option.value} value={option.value}>
													<ListboxLabel>{option.label}</ListboxLabel>
												</ListboxOption>
											))}
										</Listbox>
									</Field>
								))}
							</Stack>
						</DialogBody>

						<DialogFooter>
							{count === 0 ? null : (
								<Button type="button" variant="plain" onClick={() => apply(NO_FILTER)}>
									Clear
								</Button>
							)}

							<DialogClose>
								<Button type="button" variant="plain">
									Cancel
								</Button>
							</DialogClose>

							<FormSubmit>Apply</FormSubmit>
						</DialogFooter>
					</Form>
				</DialogPanel>
			</Dialog>
		</>
	)
}

/**
 * The body of a level page: the compilation of the elections of its scope.
 * Each level page has the same bar on top. The Segment switches the view, and
 * the filter narrows the elections, such as to the past elections of one
 * year. A scope with no filter of two options or more has no filter button.
 *
 * - List: the elections counted now, then those to come, then the past ones.
 * - Calendar: the month of the first of them, with each election day marked.
 */
export function LevelView({
	elections,
	flags,
}: {
	elections: readonly Election[]
	/** The flag of each country of the elections, which the server renders. */
	flags: CountryFlags
}) {
	const [view, setView] = useState<LevelViewKind>('list')

	const [filter, setFilter] = useState<LevelFilterValue>(NO_FILTER)

	const options = levelFilterOptions(elections)

	const filterable = Object.values(options).some((list) => list.length > 1)

	const shown = filterElections(elections, filter)

	return (
		<>
			<Flex justify="between" align="center" gap="md">
				<Segment value={view} onValueChange={(next) => setView(next as LevelViewKind)}>
					<SegmentControl aria-label="View">
						<SegmentItem value="list">List</SegmentItem>
						<SegmentItem value="calendar">Calendar</SegmentItem>
					</SegmentControl>
				</Segment>

				{filterable ? (
					<LevelFilter options={options} value={filter} onValueChange={setFilter} />
				) : null}
			</Flex>

			{view === 'list' ? (
				<ListView elections={shown} flags={flags} />
			) : (
				// A new filter opens the calendar again on its first election.
				<CalendarView
					key={shown.map((election) => election.date).join()}
					elections={shown}
					flags={flags}
				/>
			)}
		</>
	)
}
