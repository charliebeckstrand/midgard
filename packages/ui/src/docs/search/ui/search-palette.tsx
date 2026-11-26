import entries from 'virtual:docs/search'
import { useEffect, useMemo, useState } from 'react'
import { PrefetchPageLinks } from 'react-router'
import {
	CommandPalette,
	CommandPaletteDescription,
	CommandPaletteItem,
	CommandPaletteLabel,
	CommandPaletteText,
	useCommandPaletteDeferredQuery,
} from 'ui/command-palette'
import { useTimeout } from 'ui/hooks'
import { defineMessage, defineMessages, type MessageDescriptor, useIntl } from 'ui/primitives/intl'
import { VirtualOptions } from 'ui/primitives/virtual-options'
import { createSearchIndex, type Matchable } from '../engine/index.ts'
import type { SearchKind } from '../types.ts'
import { localizeEntry } from './localize.ts'

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

// The kind of each entry, which its result shows before the place of the entry.
const KIND_LABELS: Readonly<Record<SearchKind, MessageDescriptor>> = defineMessages({
	page: {
		id: 'docs.search.kind.page',
		defaultMessage: 'Page',
		description: 'The kind of a search result that is a page of the docs, such as Button.',
	},
	tab: {
		id: 'docs.search.kind.tab',
		defaultMessage: 'Tab',
		description:
			'The kind of a search result that is a tab of a page of the docs, such as Sorting.',
	},
	example: {
		id: 'docs.search.kind.example',
		defaultMessage: 'Example',
		description: 'The kind of a search result that is an example on a page of the docs.',
	},
	component: {
		id: 'docs.search.kind.component',
		defaultMessage: 'API reference',
		description:
			'The kind of a search result that is the API reference of a component: its props and its events.',
	},
	prop: {
		id: 'docs.search.kind.prop',
		defaultMessage: 'Prop',
		description:
			'The kind of a search result that is a prop of a component: an input of the component.',
	},
	event: {
		id: 'docs.search.kind.event',
		defaultMessage: 'Event',
		description:
			'The kind of a search result that is an event prop of a component, such as onChange.',
	},
})

/** An entry with the id of its option, the common name of a page, and the shown place. */
type Option = Matchable & { id: string }

const options: readonly Option[] = entries.map((entry, index) => ({
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
function PrefetchResults({ matches }: { matches: readonly Option[] }) {
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

function Results({ onPick }: { onPick: () => void }) {
	const query = useCommandPaletteDeferredQuery()

	const intl = useIntl()

	// The title of an example, the name of a tab, and the place of an entry
	// show in the language of the reader, and the query matches that text. A
	// page keeps its name from the code, and the query also matches its common
	// name, such as "Botón" for Button. The query also matches the English
	// place, so an English word, such as "sorting", finds the same entries in
	// each language.
	const index = useMemo(
		() => createSearchIndex(options.map((option) => localizeEntry(intl, option))),
		[intl],
	)

	const matches = useMemo(() => index.search(query), [index, query])

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
					<CommandPaletteItem
						key={option.id}
						id={option.id}
						href={option.href}
						onAction={onPick}
						{...meta}
					>
						{/*
						 * A name from the code, such as <Grid />, keeps its order on a
						 * right-to-left page in its own bdi. The description slot is a
						 * flex box, so one bdi holds all of the description and keeps
						 * the space before "·".
						 */}
						<CommandPaletteText>
							<CommandPaletteLabel>
								<bdi>{option.label}</bdi>
							</CommandPaletteLabel>
							<CommandPaletteDescription>
								<bdi>{`${intl.formatMessage(KIND_LABELS[option.kind])} · ${option.place}`}</bdi>
							</CommandPaletteDescription>
						</CommandPaletteText>
					</CommandPaletteItem>
				)}
			</VirtualOptions>
		</>
	)
}

/**
 * The search of the docs: a command palette over each page, tab, example,
 * component, and prop. A pick goes to the page of the entry and to its
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
