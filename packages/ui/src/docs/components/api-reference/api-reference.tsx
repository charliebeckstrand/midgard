'use client'

import {
	Accordion,
	AccordionItem,
	AccordionPanel,
	AccordionTrigger,
} from '../../../components/accordion'
import type { ComponentApi } from '../../api-reference/types'
import { ComponentEntry } from './component-entry'

/**
 * The API reference for a component family: one collapsible accordion entry per
 * exported component, each rendering its description, props, events, and
 * pass-through note via {@link ComponentEntry}.
 */
export function ApiReference({ api }: { api: ComponentApi[] }) {
	return (
		<Accordion type="multiple">
			{api.map((entry) => (
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
