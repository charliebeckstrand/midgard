import { use, useEffect, useState, useSyncExternalStore } from 'react'
import { useHydrated } from 'ui/hooks'
import { PathnameContext } from '../../primitives/current/context.ts'
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

// The path of the last page that each `UIProvider` arrived at, by its path
// store, which keeps one identity for the life of the provider. Each copy of
// the sidebar reads the same store, so the copies share one arrival. A copy
// that mounts later, as in a drawer that opens, is not an arrival.
const arrivals = new WeakMap<object, string>()

// The scope of the arrivals outside a provider that has a path. There, no page is current.
const NO_PROVIDER = {}

/**
 * The open state of each section in `sections`. The server render and the
 * hydration render have each section open, then the stored state applies.
 *
 * A load and a navigation open the section of the current page, and store
 * it as open, so the current item never hides on arrival. The reader can then
 * close that section; it stays closed until the next navigation. Each copy of
 * the sidebar, such as the copy in the page and the copy in the offcanvas
 * panel, reads the same storage, so a close in one copy closes each copy.
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

	const scope = use(PathnameContext) ?? NO_PROVIDER

	// A page is new until a copy of the sidebar stores the open of its section.
	const isNew = (target: PageLink | undefined) =>
		target !== undefined && arrivals.get(scope) !== target.path

	// The page whose section stays open until the open is in storage. The load
	// and a navigation set it. The section is thus open in the render after
	// hydration, before the effect below stores the open. Then storage alone
	// decides, so a close in one copy of the sidebar applies to each copy, and a
	// copy that mounts later shows the close.
	const [pinned, setPinned] = useState(() => (isNew(page) ? page : undefined))

	const [shownPage, setShownPage] = useState(page)

	if (shownPage !== page) {
		setShownPage(page)

		setPinned(isNew(page) ? page : undefined)
	}

	const closedSet = new Set(closed.split(' '))

	const isOpen = (section: string) => section === pinned?.category || !closedSet.has(section)

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

	// The section of a new page opens in storage too. The first copy that gets
	// to the page stores the open and the arrival. A close of the section after
	// the arrival stays until the next navigation, also in a copy that mounts
	// later.
	useEffect(() => {
		if (arrivals.get(scope) !== (page?.path ?? '')) {
			arrivals.set(scope, page?.path ?? '')

			const choice = page && sectionChoice(page.category)

			if (choice && readChoice(choice) === 'closed') writeChoice(choice, 'open')
		}

		setPinned(undefined)
	}, [page, scope])

	const setOpen = (section: string, open: boolean) => {
		writeChoice(sectionChoice(section), open ? 'open' : 'closed')
	}

	return {
		current: page?.category,
		isOpen,
		isLive: (section: string) => live.has(section),
		setOpen,
	}
}
