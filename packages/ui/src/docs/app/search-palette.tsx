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
import { VirtualOptions } from 'ui/primitives/virtual-options'
import type { SearchEntry, SearchKind } from '../plugin/search.ts'
import { matchEntries } from './search-match.ts'

// The palette of the search, with the entries in it. The shell loads this
// module in idle time after the hydration (`search.tsx`), so the entries do
// not delay the first paint, and the first open does not wait for them.

const KIND_LABELS: Readonly<Record<SearchKind, string>> = {
	page: 'Page',
	tab: 'Tab',
	example: 'Example',
	component: 'API reference',
	prop: 'Prop',
	event: 'Event',
}

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

function Results({ onPick }: { onPick: () => void }) {
	const query = useCommandPaletteDeferredQuery()

	const matches = useMemo(() => matchEntries(options, query), [query])

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
									{`${KIND_LABELS[option.kind]} · ${option.context}`}
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
	return (
		<CommandPalette
			open={open}
			onOpenChange={onOpenChange}
			placeholder="Search pages, examples, props, and events"
			footer={null}
		>
			<Results onPick={onPick} />
		</CommandPalette>
	)
}
