'use client'

import {
	Accordion,
	AccordionItem,
	AccordionPanel,
	AccordionTrigger,
} from '../../../components/accordion'
import type { ComponentApi } from '../types'
import { ComponentEntry } from './component-entry'

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
