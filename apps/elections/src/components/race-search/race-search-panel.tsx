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
import { useDrawerStep } from '../../hooks/use-drawer-step'
import { searchGroups } from '../../utilities/race-search'
import { useElectionRaces } from '../election-drawer/context'

/** Props for {@link RaceSearchPanel}. */
export type RaceSearchPanelProps = {
	election: Election
	open: boolean
	onOpenChange: (open: boolean) => void
}

/** The groups that match the query. Only this part renders again on a keystroke. */
function SearchResults({ election }: { election: Election }) {
	const query = useCommandPaletteDeferredQuery()

	const races = useElectionRaces()

	const { go } = useDrawerStep(election)

	return searchGroups(races, query).map((group) => (
		<CommandPaletteGroup key={group.heading}>
			<CommandPaletteHeading>{group.heading}</CommandPaletteHeading>

			{group.rows.map((row) => (
				<CommandPaletteItem key={row.key} onAction={() => go(row.step)}>
					{row.slot === null ? null : <Swatch color={row.slot} className="mx-1" />}

					<CommandPaletteText>
						<CommandPaletteLabel>{row.label}</CommandPaletteLabel>

						{row.description === '' ? null : (
							<CommandPaletteDescription>{row.description}</CommandPaletteDescription>
						)}
					</CommandPaletteText>
				</CommandPaletteItem>
			))}
		</CommandPaletteGroup>
	))
}

/**
 * The command palette of the search of an election. An empty query lists the
 * states. A query lists the states, then the races of each office, that match
 * it (`searchGroups`). A pick closes the palette and opens the Drawer on the
 * state or the race.
 */
export function RaceSearchPanel({ election, open, onOpenChange }: RaceSearchPanelProps) {
	return (
		<CommandPalette
			open={open}
			onOpenChange={onOpenChange}
			placeholder="Search states, races, and candidates"
		>
			<SearchResults election={election} />
		</CommandPalette>
	)
}
