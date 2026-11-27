import { useCallback, useEffect, useEffectEvent, useRef } from 'react'
import { NavigationType, useLocation, useNavigationType } from 'react-router'
import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from 'ui/accordion'
import { Heading } from 'ui/heading'
import { defineMessage, IntlMessage, useIntl } from 'ui/primitives/intl'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { createLazyModule } from '../../utilities/lazy-module.ts'
import type { BarrelApi } from '../plugin/api.ts'
import { API, componentOfHash, toApiId } from './anchors.ts'
import { PendingAnchorContext } from './context.ts'
import { HashAnchor } from './hash-anchor.tsx'
import { type PendingAnchor, scrollToPending } from './pending-anchor.ts'
import { useLoadThenOpen } from './use-load-then-open.ts'

const apiReferenceMessage = defineMessage({
	id: 'docs.api.reference',
	defaultMessage: 'API reference',
	description:
		'The heading of the part of a page that lists each component with its props and its events.',
})

const englishNoteMessage = defineMessage({
	id: 'docs.api.englishNote',
	defaultMessage: 'This reference comes from the source code and is in English.',
	description:
		'The note under the heading of the API reference on a page in a language other than English. The descriptions of the components and of the props come from the comments of the source code, and they stay in English.',
})

// The entry renders TSDoc as Markdown, so it carries `marked`. It is a chunk
// of its own, so it does not delay the first paint. It loads in idle time
// after the mount, or before that when the reader points at the list. Each
// table shares the load.
type EntryModule = typeof import('./api-entry.tsx')

const entryModule = createLazyModule(() => import('./api-entry.tsx'))

/**
 * The API reference of a barrel: one entry for each component, in the name
 * order of the API data. The entry loads in idle time after the mount, or
 * when the reader points at the list or focuses it.
 *
 * Each entry and each prop has an id ({@link toApiId}). When the hash of the
 * location names a closed entry, or a prop in it, the entry opens and the page
 * scrolls to the element of the hash. After a link or a pick in the search,
 * the focus also goes to the element. The browser scrolls to an element that
 * is on the page already, so an open entry does nothing. A table that mounts
 * after the load of its chunk starts with the entry of the hash open.
 */
export function ApiTable({ api }: { api: BarrelApi }) {
	const components = Object.values(api)

	// In idle time, the entry also lexes the Markdown of the API data in short
	// slices, so the first entry that opens does not lex.
	const primeEntry = useCallback(
		(module: EntryModule, signal: AbortSignal) => module.primeApi(api, signal),
		[api],
	)

	const location = useLocation()

	const navigationType = useNavigationType()

	const named = componentOfHash(location.hash)

	const target = named !== undefined && named in api ? named : undefined

	// A table that mounts with its chunk loaded, as after a move to a new page,
	// starts with the entry of the hash open. So the page has its full height in
	// its first commit, and the scroll of the navigation (`useNavigationScroll`)
	// goes to the element of the hash, or back to the scroll that the reader
	// left. The chunk is not loaded at hydration, so the hydration render opens
	// nothing, as the server does.
	const {
		module: entry,
		open,
		change,
		warm,
	} = useLoadThenOpen<string[], EntryModule>({
		initial: target !== undefined && entryModule.read() ? [target] : [],
		lazy: entryModule,
		prime: primeEntry,
	})

	// The accordion gives the next value from the value that it shows. Before
	// the chunk loads, two clicks start from the same value, so each change
	// applies only the entries that it opened or closed.
	const toggle = (next: string[]) =>
		change((prev) => {
			const opened = next.filter((name) => !open.includes(name))

			const closed = open.filter((name) => !next.includes(name))

			return [
				...prev.filter((name) => !closed.includes(name)),
				...opened.filter((name) => !prev.includes(name)),
			]
		})

	const intl = useIntl()

	// A page in another language tells the reader that the TSDoc is English.
	// The default locale is English for an English locale only (`catalogIntl`).
	const translated = intl.locale !== intl.defaultLocale

	// The anchor to scroll to when its row mounts and when its entry has opened.
	const pending = useRef<PendingAnchor | null>(null)

	// The location at the mount of the table: the load, or the move to the page.
	const mounted = useRef(location)

	const reveal = useEffectEvent((component: string, id: string) => {
		if (open.includes(component)) return

		const pop = navigationType === NavigationType.Pop

		// A move through the history on the same page keeps the entries as they
		// are, and the box goes back to the scroll of the entry of the history
		// (`useNavigationScroll`).
		if (pop && location !== mounted.current) return

		// A link or a pick in the search moves the focus to the anchor, as
		// `useNavigationScroll` does for an anchor on the page. A load and a move
		// through the history keep the focus.
		pending.current = { id, component, opened: false, focus: !pop }

		change((prev) => (prev.includes(component) ? prev : [...prev, component]))
	})

	// Each navigation gives a new location, also a link to the hash that the
	// location has already, such as a pick in the search. So the entry opens
	// again after the reader closed it.
	useEffect(() => {
		if (target) reveal(target, location.hash.slice(1))
	}, [target, location])

	if (components.length === 0) return null

	return (
		<Stack gap="sm">
			<Heading level={2} id={API}>
				<HashAnchor to={API}>
					<IntlMessage message={apiReferenceMessage} />
				</HashAnchor>
			</Heading>
			{translated && (
				<Text tone="muted">
					<IntlMessage message={englishNoteMessage} />
				</Text>
			)}
			<PendingAnchorContext value={pending}>
				<Accordion
					variant="outline"
					multiple
					value={open}
					onValueChange={toggle}
					onPointerEnter={warm}
					onPointerDown={warm}
					onFocus={warm}
					onOpenComplete={(component) => {
						if (pending.current?.component !== component) return

						pending.current.opened = true

						scrollToPending(pending)
					}}
				>
					{components.map((component) => (
						<AccordionItem key={component.name} value={component.name}>
							<AccordionTrigger className="font-mono">
								<span
									id={toApiId(component.name)}
									translate="no"
									dir="ltr"
								>{`<${component.name} />`}</span>
							</AccordionTrigger>
							<AccordionPanel>{entry && <entry.ApiEntry component={component} />}</AccordionPanel>
						</AccordionItem>
					))}
				</Accordion>
			</PendingAnchorContext>
		</Stack>
	)
}
