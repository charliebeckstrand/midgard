import { lazy, Suspense } from 'react'
import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from 'ui/accordion'
import { Heading } from 'ui/heading'
import { Stack } from 'ui/stack'
import type { BarrelApi } from '../plugin/api.ts'

// The entry renders TSDoc as Markdown, so it carries `marked`. It is a chunk
// of its own, so the page does not load it until the reader opens an entry.
const loadEntry = () => import('./api-entry.tsx').then(({ ApiEntry }) => ({ default: ApiEntry }))

const ApiEntry = lazy(loadEntry)

/**
 * The API reference of a barrel: one entry for each component, in the name
 * order of the API data. The entry loads when the reader points at the list
 * or focuses it.
 */
export function ApiTable({ api }: { api: BarrelApi }) {
	const components = Object.values(api)

	if (components.length === 0) return null

	return (
		<Stack gap="sm">
			<Heading level={2}>API reference</Heading>
			<Accordion
				type="multiple"
				onPointerEnter={loadEntry}
				onPointerDown={loadEntry}
				onFocus={loadEntry}
			>
				{components.map((component) => (
					<AccordionItem key={component.name} value={component.name}>
						<AccordionTrigger className="font-mono">{`<${component.name} />`}</AccordionTrigger>
						<AccordionPanel>
							<Suspense fallback={null}>
								<ApiEntry component={component} />
							</Suspense>
						</AccordionPanel>
					</AccordionItem>
				))}
			</Accordion>
		</Stack>
	)
}
