'use client'

import { Search } from 'lucide-react'
import { useState } from 'react'
import { Button } from 'ui/button'
import { useIntentLoad, useKeybindings } from 'ui/hooks'
import { Icon } from 'ui/icon'
import type { Election } from '../../elections/registry'

/**
 * Loads the module of the search panel, which carries the command palette.
 * The page loads it in idle time after the hydration, so the first load of a
 * page does not carry that code, and the first open does not wait for it.
 */
const loadPanel = () => import('./race-search-panel')

/** Props for {@link RaceSearch}. */
export type RaceSearchProps = { election: Election }

/**
 * The search of an election, in the header of each of its pages: an icon
 * button that opens a command palette of the states and the races of the
 * election. A pick opens the Drawer of the page on the state or the race, as
 * a press on the map does. The races come from `ElectionRacesProvider`.
 *
 * ⌘K or Ctrl+K also opens the search. The page does not show the shortcut.
 *
 * @remarks As the search of Places: the panel loads in idle time after the
 * hydration. A pointer on the button or a focus on it starts the load sooner,
 * and a press or ⌘K before the load opens the panel when the module arrives.
 * Until the load, this component holds ⌘K. After the load, the palette holds it.
 */
export function RaceSearch({ election }: RaceSearchProps) {
	const [open, setOpen] = useState(false)

	const { module: panel, request, preload } = useIntentLoad(loadPanel)

	const show = () => request(() => setOpen(true))

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
				aria-label="Search races"
				onPointerEnter={preload}
				onPointerDown={preload}
				onFocus={preload}
				onClick={show}
			>
				<Icon icon={<Search />} />
			</Button>

			{panel && <panel.RaceSearchPanel election={election} open={open} onOpenChange={setOpen} />}
		</>
	)
}
