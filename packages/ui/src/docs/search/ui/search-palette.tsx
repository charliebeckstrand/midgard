import entries from 'virtual:docs/search'
import { useEffect, useMemo, useState } from 'react'
import { PrefetchPageLinks } from 'react-router'
import { CommandPalette, useCommandPaletteDeferredQuery } from 'ui/command-palette'
import { useTimeout } from 'ui/hooks'
import { defineMessage, useIntl } from 'ui/primitives/intl'
import { VirtualOptions } from 'ui/primitives/virtual-options'
import { componentOfHash, toApiId } from '../../kit/anchors.ts'
import { createSearchIndex, findMember } from '../engine/index.ts'
import { localizeEntry } from './localize.ts'
import { type SearchOption, SearchResult } from './search-result.tsx'

// The palette of the search, with the entries in it. The shell loads this
// module in idle time after the hydration (`search-provider.tsx`), so the
// entries do not delay the first paint, and the first open does not wait for
// them.

const placeholderMessage = defineMessage({
	id: 'docs.search.placeholder',
	defaultMessage: 'Search',
	description:
		'The placeholder of the search field of the docs, and its name. Props and events are the inputs of a component.',
})

const options: readonly SearchOption[] = entries.map((entry, index) => ({
	...entry,
	id: `search-${index}`,
}))

/**
 * The count of the first results whose pages the palette loads. The results
 * go best first, so the pick of the reader is usually among them. Several of
 * them often name the same page, so the load is small.
 */
const PREFETCH_COUNT = 3

/**
 * The time in ms that the query must stay the same before the load starts, so
 * that each keystroke does not start a load.
 */
const PREFETCH_SETTLE = 300

/**
 * Loads the code of the pages of the first results, as a `RouterLink` does on
 * a hover. A pick then does not wait for the network. An empty query has no
 * results, so it loads nothing.
 */
function PrefetchResults({ matches }: { matches: readonly SearchOption[] }) {
	const [pages, setPages] = useState<readonly string[]>([])

	const timeout = useTimeout()

	useEffect(() => {
		const next = [
			...new Set(
				matches.slice(0, PREFETCH_COUNT).map((option) => option.href.split('#')[0] ?? option.href),
			),
		]

		timeout.set(() => setPages(next), PREFETCH_SETTLE)
	}, [matches, timeout])

	return pages.map((page) => <PrefetchPageLinks key={page} page={page} />)
}

/**
 * The option with a link to the row of its prop or its event, when a word of
 * `query` is the name of one: `button variant` goes to the `variant` row of
 * `<Button />`. Any other option keeps its link.
 */
function toMemberLink(option: SearchOption, query: string): SearchOption {
	const member = findMember(option, query)

	const [path, hash = ''] = option.href.split('#')

	const component = componentOfHash(`#${hash}`)

	if (member === undefined || component === undefined) return option

	return { ...option, href: `${path}#${toApiId(component, member)}` }
}

function Results({ onPick }: { onPick: () => void }) {
	const query = useCommandPaletteDeferredQuery()

	const intl = useIntl()

	// The name of a tab and the place of an entry show in the language of the
	// reader, and the query matches that text (`localize.ts`). A page keeps its
	// name from the code, and the query also matches its common name, such as
	// "Botón" for Button.
	const index = useMemo(
		() => createSearchIndex(options.map((option) => localizeEntry(intl, option))),
		[intl],
	)

	const matches = useMemo(
		() => index.search(query).map((option) => toMemberLink(option, query)),
		[index, query],
	)

	return (
		<>
			<PrefetchResults matches={matches} />
			{/*
			 * The dialog body is the scroller of the list. It grows with the rows, up
			 * to the cap of the panel in the viewport, and then scrolls. With no
			 * match, such as for an empty query, the body hides, and the palette is
			 * only the search field.
			 */}
			<VirtualOptions items={matches} getOptionId={(option) => option.id}>
				{(option, _index, meta) => (
					<SearchResult key={option.id} option={option} meta={meta} onPick={onPick} />
				)}
			</VirtualOptions>
		</>
	)
}

/**
 * The search of the docs: a command palette over each page, tab, and API
 * reference of a component. A prop or an event finds the API reference of its
 * component. A pick goes to the page of the entry and to its
 * anchor. `⌘K`, or `Ctrl+K` elsewhere, opens it and closes it.
 */
export function SearchPalette({
	open,
	onOpenChange,
	onPick,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	/** Runs after a pick, as the palette closes. */
	onPick: () => void
}) {
	const intl = useIntl()

	return (
		<CommandPalette
			open={open}
			onOpenChange={onOpenChange}
			placeholder={intl.formatMessage(placeholderMessage)}
		>
			<Results onPick={onPick} />
		</CommandPalette>
	)
}
