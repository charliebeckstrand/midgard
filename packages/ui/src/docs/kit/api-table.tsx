import { useCallback } from 'react'
import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from 'ui/accordion'
import { Heading } from 'ui/heading'
import { Stack } from 'ui/stack'
import type { BarrelApi } from '../plugin/api.ts'
import { useLoadThenOpen } from './load-then-open.ts'

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
		change((current) => {
			const opened = next.filter((name) => !open.includes(name))

			const closed = open.filter((name) => !next.includes(name))

			return [
				...current.filter((name) => !closed.includes(name)),
				...opened.filter((name) => !current.includes(name)),
			]
		})

	if (components.length === 0) return null

	return (
		<Stack gap="sm">
			<Heading level={2}>API reference</Heading>
			<Accordion
				type="multiple"
				value={open}
				onValueChange={toggle}
				onPointerEnter={warm}
				onPointerDown={warm}
				onFocus={warm}
			>
				{components.map((component) => (
					<AccordionItem key={component.name} value={component.name}>
						<AccordionTrigger className="font-mono">{`<${component.name} />`}</AccordionTrigger>
						<AccordionPanel>{ApiEntry && <ApiEntry component={component} />}</AccordionPanel>
					</AccordionItem>
				))}
			</Accordion>
		</Stack>
	)
}
