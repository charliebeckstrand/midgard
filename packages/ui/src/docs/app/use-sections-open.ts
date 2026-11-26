import { useEffect, useState, useSyncExternalStore } from 'react'
import { useHydrated } from 'ui/hooks'
import {
	readChoice,
	restoreChoiceCookie,
	subscribeChoices,
	writeChoice,
} from '../../utilities/stored-choice.ts'
import type { PageLink } from '../plugin/pages.ts'
import { sectionChoice } from './section-marks.ts'

/** The closed sections in storage, joined by spaces, so the snapshot is a string that compares by value. */
function readClosed(sections: readonly string[]): string {
	return sections.filter((section) => readChoice(sectionChoice(section)) === 'closed').join(' ')
}

/**
 * The open state of each section in `sections`. The server render and the
 * hydration render have each section open, then the stored state applies.
 *
 * The section of the current page is open, so the current item never hides. A
 * navigation to a page in a closed section stores the section as open. The
 * reader can close the section of the current page; it stays closed until the
 * next navigation.
 *
 * @param sections - The section folders, as a stable array.
 * @param page - The current page. Without one, as on the not-found page, no section is current.
 */
export function useSectionsOpen(sections: readonly string[], page: PageLink | undefined) {
	const closed = useSyncExternalStore(
		subscribeChoices,
		() => readClosed(sections),
		() => '',
	)

	const hydrated = useHydrated()

	// Whether the reader closed the section of the current page. A navigation
	// clears it, also a navigation back to the same page.
	const [released, setReleased] = useState(false)

	const [shownPage, setShownPage] = useState(page)

	if (shownPage !== page) {
		setShownPage(page)

		setReleased(false)
	}

	const current = released ? undefined : page?.category

	const closedSet = new Set(closed.split(' '))

	const isOpen = (section: string) => section === current || !closedSet.has(section)

	// The sections that were open in a render after hydration. From then on, the
	// state of the section alone shows or hides it, and the root class does not.
	// The render that applies a stored close keeps the section out of the set,
	// so the root class hides the close.
	const [live, setLive] = useState<ReadonlySet<string>>(() => new Set())

	if (hydrated && sections.some((section) => isOpen(section) && !live.has(section))) {
		setLive(new Set([...live, ...sections.filter(isOpen)]))
	}

	// A cookie that expired gets its value again from `localStorage`.
	useEffect(() => {
		for (const section of sections) restoreChoiceCookie(sectionChoice(section))
	}, [sections])

	// The section of a new page opens in storage too.
	useEffect(() => {
		if (current !== undefined && closed.split(' ').includes(current)) {
			writeChoice(sectionChoice(current), 'open')
		}
	}, [current, closed])

	const setOpen = (section: string, open: boolean) => {
		writeChoice(sectionChoice(section), open ? 'open' : 'closed')

		if (!open && page?.category === section) setReleased(true)
	}

	return { current, isOpen, isLive: (section: string) => live.has(section), setOpen }
}
