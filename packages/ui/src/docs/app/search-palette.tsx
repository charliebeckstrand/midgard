import pages from 'virtual:docs/pages'
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
import { exampleTitle } from '../kit/example-title.ts'
import { tabName } from '../kit/tab-name.ts'
import type { SearchEntry, SearchKind } from '../plugin/search.ts'
import { sectionLabel } from './app-messages.ts'
import { matchEntries } from './search-match.ts'

// The palette of the search, with the entries in it. The shell loads this
// module in idle time after the hydration (`search.tsx`), so the entries do
// not delay the first paint, and the first open does not wait for them.

const placeholderMessage = defineMessage({
	id: 'docs.search.placeholder',
	defaultMessage: 'Search pages, examples, props, and events',
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

// The section of each page, by its path. The result of a page shows the name
// of its section in the language of the reader.
const sectionByPath: ReadonlyMap<string, string> = new Map(
	pages.map((page) => [page.path, page.category]),
)

/** An entry with the id of its option. */
type Option = SearchEntry & { id: string }

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
 * a hover. A pick then does not wait for the network. An empty query lists
 * each page in the order of the sidebar, not by relevance, so it loads nothing.
 */
function PrefetchResults({ query, matches }: { query: string; matches: readonly Option[] }) {
	const [pages, setPages] = useState<readonly string[]>([])

	const timeout = useTimeout()

	useEffect(() => {
		const next =
			// `matchEntries` reads only letters and digits, so a query with none is empty.
			!/[\p{L}\p{N}]/u.test(query)
				? []
				: [
						...new Set(
							matches
								.slice(0, PREFETCH_COUNT)
								.map((option) => option.href.split('#')[0] ?? option.href),
						),
					]

		timeout.set(() => setPages(next), PREFETCH_SETTLE)
	}, [query, matches, timeout])

	return pages.map((page) => <PrefetchPageLinks key={page} page={page} />)
}

/** The slug of the tab of a path, the last part before the hash: `/grid/sorting#basic` gives `sorting`. */
function slugOfHref(href: string): string {
	return href.split('#')[0]?.split('/').at(-1) ?? ''
}

function Results({ onPick }: { onPick: () => void }) {
	const query = useCommandPaletteDeferredQuery()

	const intl = useIntl()

	// Where the entry is. The section of a page and the name of a tab, as in
	// "Grid › Sorting", show in the language of the reader. The names from the
	// code stay as they are.
	const formatContext = (option: Option): string => {
		const section = option.kind === 'page' ? sectionByPath.get(option.href) : undefined

		if (section !== undefined) return sectionLabel(intl, section)

		const [page, tab] = option.context.split(' › ')

		return tab === undefined
			? option.context
			: `${page} › ${tabName(intl, slugOfHref(option.href), tab)}`
	}

	// The title of an example and the name of a tab show in the language of the
	// reader, and the query matches that text. The names from the code stay as
	// they are.
	const localized = useMemo(
		() =>
			options.map((option) => {
				if (option.kind === 'example') {
					return {
						...option,
						label: exampleTitle(intl, option.href.split('#')[1] ?? '', option.label),
					}
				}

				if (option.kind === 'tab') {
					return { ...option, label: tabName(intl, slugOfHref(option.href), option.label) }
				}

				return option
			}),
		[intl],
	)

	const matches = useMemo(() => matchEntries(localized, query), [localized, query])

	return (
		<>
			<PrefetchResults query={query} matches={matches} />
			{/* The dialog body grows with its content. The list has a fixed height, so that it scrolls. */}
			<div className="h-80 overflow-y-auto">
				<VirtualOptions items={matches} getOptionId={(option) => option.id}>
					{(option, _index, meta) => (
						<CommandPaletteItem
							key={option.id}
							id={option.id}
							href={option.href}
							onAction={onPick}
							{...meta}
						>
							<CommandPaletteText>
								<CommandPaletteLabel>{option.label}</CommandPaletteLabel>
								<CommandPaletteDescription>
									{`${intl.formatMessage(KIND_LABELS[option.kind])} · ${formatContext(option)}`}
								</CommandPaletteDescription>
							</CommandPaletteText>
						</CommandPaletteItem>
					)}
				</VirtualOptions>
			</div>
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
			footer={null}
		>
			<Results onPick={onPick} />
		</CommandPalette>
	)
}
