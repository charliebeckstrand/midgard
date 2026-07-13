import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from 'ui/accordion'
import { Markdown } from 'ui/markdown'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import type { CallableApi, ComponentApi, OtherApi, SymbolApi } from '../../engine/extractor'
import { CallableEntry } from './callable-entry'
import { ComponentEntry } from './component-entry'

/**
 * The API tab for a docs page: every export of the page's module, grouped by
 * kind. Components render as collapsible accordion entries — description,
 * props, events, and pass-through note via {@link ComponentEntry} — followed by
 * hooks and functions via {@link CallableEntry}, then unmodelled exports as
 * minimal name-plus-description rows.
 *
 * `exports` arrives in barrel-declaration order; ordering is a display concern
 * settled here, mirroring how {@link ComponentEntry} sorts props and events.
 * Copies keep the sort off the source array. The caller ({@link ApiPanel})
 * owns the empty-surface message, so `exports` is always non-empty here.
 */
export function ApiTab({ exports }: { exports: SymbolApi[] }) {
	const components = sorted(exports.filter((e): e is ComponentApi => e.kind === 'component'))

	const callables = sorted(
		exports.filter((e): e is CallableApi => e.kind === 'hook' || e.kind === 'function'),
	)

	const others = sorted(exports.filter((e): e is OtherApi => e.kind === 'other'))

	return (
		<Stack gap="lg">
			{components.length > 0 && (
				<Accordion type="multiple">
					{components.map((entry) => (
						<AccordionItem key={entry.name} value={entry.name}>
							<AccordionTrigger className="font-mono">{`<${entry.name} />`}</AccordionTrigger>
							<AccordionPanel>
								<ComponentEntry entry={entry} />
							</AccordionPanel>
						</AccordionItem>
					))}
				</Accordion>
			)}
			{callables.length > 0 && (
				<Accordion type="multiple">
					{callables.map((entry) => (
						<AccordionItem key={entry.name} value={entry.name}>
							<AccordionTrigger className="font-mono">{`${entry.name}()`}</AccordionTrigger>
							<AccordionPanel>
								<CallableEntry entry={entry} />
							</AccordionPanel>
						</AccordionItem>
					))}
				</Accordion>
			)}
			{others.map((entry) => (
				<OtherRow key={entry.name} entry={entry} />
			))}
		</Stack>
	)
}

/** Alphabetical copy, keeping the sort off the source array. */
function sorted<T extends { name: string }>(entries: T[]): T[] {
	return [...entries].sort((a, b) => a.name.localeCompare(b.name))
}

/** An export the extractor recognizes but does not model: mono name plus description. */
function OtherRow({ entry }: { entry: OtherApi }) {
	return (
		<Stack gap="sm">
			<code className="font-mono font-medium text-zinc-900 dark:text-white">{entry.name}</code>
			{entry.description && (
				<Text severity="muted">
					<Markdown inline>{entry.description}</Markdown>
				</Text>
			)}
		</Stack>
	)
}
