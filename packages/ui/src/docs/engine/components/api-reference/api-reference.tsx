'use client'

import {
	Accordion,
	AccordionItem,
	AccordionPanel,
	AccordionTrigger,
} from '../../../../components/accordion'
import type { ComponentApi } from '../../api-reference/types'
import { ComponentEntry } from './component-entry'

/**
 * The API reference for a component family: one collapsible accordion entry per
 * exported component, sorted alphabetically by name, each rendering its
 * description, props, events, and pass-through note via {@link ComponentEntry}.
 *
 * `api` arrives in barrel-declaration order; ordering is a display concern
 * settled here, mirroring how {@link ComponentEntry} sorts props and events. A
 * copy keeps the sort off the source array.
 */
export function ApiReference({ api }: { api: ComponentApi[] }) {
	const entries = [...api].sort((a, b) => a.name.localeCompare(b.name))

	return (
		<Accordion type="multiple">
			{entries.map((entry) => (
				<AccordionItem key={entry.name} value={entry.name}>
					<AccordionTrigger className="font-mono">{`<${entry.name} />`}</AccordionTrigger>
					<AccordionPanel>
						<ComponentEntry entry={entry} />
					</AccordionPanel>
				</AccordionItem>
			))}
		</Accordion>
	)
}
