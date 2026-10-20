import { useCallback, useEffect, useEffectEvent, useRef } from 'react'
import { useLocation } from 'react-router'
import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from 'ui/accordion'
import { Heading } from 'ui/heading'
import { Link } from 'ui/link'
import { defineMessage, IntlMessage } from 'ui/primitives/intl'
import { Stack } from 'ui/stack'
import type { BarrelApi } from '../plugin/api.ts'
import { API, componentOfHash, toApiId } from './anchors.ts'
import { useLoadThenOpen } from './load-then-open.ts'
import { type PendingAnchor, PendingAnchorContext, scrollToPending } from './pending-anchor.ts'

const apiReferenceMessage = defineMessage({
	id: 'docs.api.reference',
	defaultMessage: 'API reference',
	description:
		'The heading of the part of a page that lists each component with its props and its events.',
})

// The entry renders TSDoc as Markdown, so it carries `marked`. It is a chunk
// of its own, so it does not delay the first paint. It loads in idle time
// after the mount, or before that when the reader points at the list. A load
// that fails keeps its failure, as the browser does.
type EntryModule = typeof import('./api-entry.tsx')

let entry: Promise<EntryModule> | undefined

// The entry component, when its chunk is loaded.
let ApiEntry: EntryModule['ApiEntry'] | undefined

function loadEntry(): Promise<EntryModule> {
	entry ??= import('./api-entry.tsx').then((module) => {
		ApiEntry = module.ApiEntry

		return module
	})

	return entry
}

/**
 * The API reference of a barrel: one entry for each component, in the name
 * order of the API data. The entry loads in idle time after the mount, or
 * when the reader points at the list or focuses it.
 *
 * Each entry and each prop has an id ({@link toApiId}). When the hash of the
 * location names a closed entry, or a prop in it, the entry opens and the page
 * scrolls to the element of the hash. The browser scrolls to an element that
 * is on the page already, so an open entry does nothing.
 */
export function ApiTable({ api }: { api: BarrelApi }) {
	const components = Object.values(api)

	// In idle time, the entry also lexes the Markdown of the API data in short
	// slices, so the first entry that opens does not lex.
	const primeEntry = useCallback(
		(module: EntryModule, signal: AbortSignal) => module.primeApi(api, signal),
		[api],
	)

	const { open, change, warm } = useLoadThenOpen<string[], EntryModule>({
		initial: [],
		load: loadEntry,
		loaded: () => ApiEntry !== undefined,
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

	const { hash } = useLocation()

	const named = componentOfHash(hash)

	const target = named !== undefined && named in api ? named : undefined

	// The anchor to scroll to when its row mounts and when its entry has opened.
	const pending = useRef<PendingAnchor | null>(null)

	const reveal = useEffectEvent((component: string, id: string) => {
		if (open.includes(component)) return

		pending.current = { id, component, opened: false }

		change((prev) => (prev.includes(component) ? prev : [...prev, component]))
	})

	useEffect(() => {
		if (target) reveal(target, hash.slice(1))
	}, [target, hash])

	if (components.length === 0) return null

	return (
		<Stack gap="sm">
			<Heading level={2} id={API}>
				<Link href={`#${API}`}>
					<IntlMessage message={apiReferenceMessage} />
				</Link>
			</Heading>
			<PendingAnchorContext value={pending}>
				<Accordion
					type="multiple"
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
								<span id={toApiId(component.name)}>{`<${component.name} />`}</span>
							</AccordionTrigger>
							<AccordionPanel>{ApiEntry && <ApiEntry component={component} />}</AccordionPanel>
						</AccordionItem>
					))}
				</Accordion>
			</PendingAnchorContext>
		</Stack>
	)
}
