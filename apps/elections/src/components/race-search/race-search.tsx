'use client'

import { Search } from 'lucide-react'
import { useState } from 'react'
import { Button } from 'ui/button'
import { useIntentLoad, useKeybindings } from 'ui/hooks'
import { Icon } from 'ui/icon'
import type { Election } from '../../elections/registry'
import type { ElectionRaces } from '../../utilities/race-search'
import { useRaceSearch } from './context'

/**
 * Loads the module of the search panel, which carries the command palette.
 * The page loads it in idle time after the hydration, so the first load of a
 * page does not carry that code, and the first open does not wait for it.
 */
const loadPanel = () => import('./race-search-panel')

/**
 * Props for {@link RaceSearch}: the election of the page, or each election for
 * a level page.
 */
export type RaceSearchProps =
	| { election: Election; elections?: never }
	| { elections: readonly ElectionRaces[]; election?: never }

/**
 * The search of an election, in the header of each of its pages: an icon
 * button that opens a command palette of the states and the races of the
 * election. A pick opens the Drawer of the page on the state or the race, as
 * a press on the map does. The races come from `ElectionRacesProvider`.
 *
 * On a level page, the search holds each election, and the
 * states and the races of each (`elections`). A pick goes to the page of the
 * election, with the Drawer on the state or the race.
 *
 * ⌘K or Ctrl+K also opens the search. The page does not show the shortcut.
 *
 * The open state comes from `RaceSearchProvider`, which the Drawer shares. A
 * pick keeps the query, and Back to search in the Drawer opens the search on
 * it again. Each other open starts with an empty query.
 *
 * @remarks As the search of Places: the panel loads in idle time after the
 * hydration. A pointer on the button or a focus on it starts the load sooner,
 * and a press or ⌘K before the load opens the panel when the module arrives.
 * Until the load, this component holds ⌘K. After the load, the palette holds it.
 */
export function RaceSearch({ election, elections }: RaceSearchProps) {
	const { open, setOpen } = useRaceSearch()

	// The query stays across a close, so Back to search in the Drawer opens the
	// search on the query of the pick. Each other open starts empty.
	const [query, setQuery] = useState('')

	const onOpenChange = (next: boolean) => {
		if (next) setQuery('')

		setOpen(next)
	}

	const { module: panel, request, preload } = useIntentLoad(loadPanel)

	const show = () => request(() => onOpenChange(true))

	useKeybindings(
		{
			'$mod+KeyK': (event) => {
				event.preventDefault()

				show()
			},
		},
		{ enabled: panel === undefined },
	)

	return (
		<>
			<Button
				variant="bare"
				aria-label={election === undefined ? 'Search elections' : 'Search races'}
				onPointerEnter={preload}
				onPointerDown={preload}
				onFocus={preload}
				onClick={show}
			>
				<Icon icon={<Search />} />
			</Button>

			{panel === undefined ? null : election === undefined ? (
				<panel.ElectionsSearchPanel
					elections={elections}
					open={open}
					onOpenChange={onOpenChange}
					query={query}
					onQueryChange={setQuery}
				/>
			) : (
				<panel.RaceSearchPanel
					election={election}
					open={open}
					onOpenChange={onOpenChange}
					query={query}
					onQueryChange={setQuery}
				/>
			)}
		</>
	)
}
