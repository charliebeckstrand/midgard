'use client'

import {
	CommandPalette,
	CommandPaletteDescription,
	CommandPaletteGroup,
	CommandPaletteHeading,
	CommandPaletteItem,
	CommandPaletteLabel,
	CommandPaletteText,
	useCommandPaletteDeferredQuery,
} from 'ui/command-palette'
import { Swatch } from 'ui/swatch'
import type { Election } from '../../elections/registry'
import { useDrawerGo } from '../../hooks/use-drawer'
import {
	type ElectionRaces,
	electionsSearchGroups,
	type SearchRow,
	searchGroups,
} from '../../utilities/race-search'
import { useElectionRaces } from '../election-drawer/context'
import { useRaceSearch } from './context'

/** The content of a row: the color of the leader of a race, the name, and the description. */
function RowContent({ row }: { row: Omit<SearchRow, 'step'> }) {
	return (
		<>
			{row.slot === null ? null : <Swatch color={row.slot} className="mx-1" />}

			<CommandPaletteText>
				<CommandPaletteLabel>{row.label}</CommandPaletteLabel>

				{row.description === '' ? null : (
					<CommandPaletteDescription>{row.description}</CommandPaletteDescription>
				)}
			</CommandPaletteText>
		</>
	)
}

/** The groups that match the query. Only this part renders again on a keystroke. */
function SearchResults({ election }: { election: Election }) {
	const query = useCommandPaletteDeferredQuery()

	const races = useElectionRaces()

	const go = useDrawerGo(election)

	const { pick } = useRaceSearch()

	return searchGroups(races, query).map((group) => (
		<CommandPaletteGroup key={group.heading}>
			<CommandPaletteHeading>{group.heading}</CommandPaletteHeading>

			{group.rows.map((row) => (
				<CommandPaletteItem
					key={row.key}
					onAction={() => {
						pick()

						go(row.step)
					}}
				>
					<RowContent row={row} />
				</CommandPaletteItem>
			))}
		</CommandPaletteGroup>
	))
}

/** Props for {@link RaceSearchPanel}. */
export type RaceSearchPanelProps = {
	election: Election
	open: boolean
	onOpenChange: (open: boolean) => void
	/** The query, which the search holds across a close. */
	query: string
	onQueryChange: (query: string) => void
}

/**
 * The command palette of the search of an election. An empty query lists
 * nothing. A query lists the states, then the races of each office, that match
 * it (`searchGroups`). A pick closes the palette and opens the Drawer on the
 * state or the race, with Back to search.
 */
export function RaceSearchPanel({
	election,
	open,
	onOpenChange,
	query,
	onQueryChange,
}: RaceSearchPanelProps) {
	return (
		<CommandPalette
			open={open}
			onOpenChange={onOpenChange}
			query={query}
			onQueryChange={onQueryChange}
			placeholder="Search states, races, and candidates"
		>
			<SearchResults election={election} />
		</CommandPalette>
	)
}

/** The groups of every election that match the query. Only this part renders again on a keystroke. */
function ElectionsResults({ elections }: { elections: readonly ElectionRaces[] }) {
	const query = useCommandPaletteDeferredQuery()

	return electionsSearchGroups(elections, query).map((group) => (
		<CommandPaletteGroup key={group.heading}>
			<CommandPaletteHeading>{group.heading}</CommandPaletteHeading>

			{group.rows.map((row) => (
				<CommandPaletteItem key={row.key} href={row.href}>
					<RowContent row={row} />
				</CommandPaletteItem>
			))}
		</CommandPaletteGroup>
	))
}

/** Props for {@link ElectionsSearchPanel}. */
export type ElectionsSearchPanelProps = {
	elections: readonly ElectionRaces[]
	open: boolean
	onOpenChange: (open: boolean) => void
	/** The query, which the search holds across a close. */
	query: string
	onQueryChange: (query: string) => void
}

/**
 * The command palette of the search of every election. An empty query lists
 * the elections. A query lists the elections, then the states and the races of
 * each election, that match it (`electionsSearchGroups`). A pick goes to the
 * page of the election, with the Drawer on the state or the race.
 */
export function ElectionsSearchPanel({
	elections,
	open,
	onOpenChange,
	query,
	onQueryChange,
}: ElectionsSearchPanelProps) {
	return (
		<CommandPalette
			open={open}
			onOpenChange={onOpenChange}
			query={query}
			onQueryChange={onQueryChange}
			placeholder="Search elections, races, and candidates"
		>
			<ElectionsResults elections={elections} />
		</CommandPalette>
	)
}
