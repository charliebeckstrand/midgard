import { useCallback, useState } from 'react'
import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from 'ui/accordion'
import { Heading } from 'ui/heading'
import { Stack } from 'ui/stack'
import type { BarrelApi } from '../plugin/api.ts'
import { useIdle } from './idle.ts'

// The entry renders TSDoc as Markdown, so it carries `marked`. It is a chunk
// of its own, so it does not delay the first paint. It loads in idle time
// after the mount, or before that when the reader points at the list.
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

	const [open, setOpen] = useState<string[]>([])

	// In idle time, the entry also lexes the Markdown of the API data, so the
	// first entry that opens does not lex.
	const prepare = useCallback(() => loadEntry().then((module) => module.primeApi(api)), [api])

	useIdle(prepare)

	// An entry opens when its chunk is loaded, so it opens at its full height
	// with its props in it. An entry that suspends opens empty, and React then
	// holds the props back for at least 300 ms.
	const change = (next: string[]) => {
		if (ApiEntry) setOpen(next)
		else loadEntry().then(() => setOpen(next))
	}

	if (components.length === 0) return null

	return (
		<Stack gap="sm">
			<Heading level={2}>API reference</Heading>
			<Accordion
				type="multiple"
				value={open}
				onValueChange={change}
				onPointerEnter={loadEntry}
				onPointerDown={loadEntry}
				onFocus={loadEntry}
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
