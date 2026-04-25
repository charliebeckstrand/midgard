'use client'

import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import {
	Accordion,
	AccordionButton,
	AccordionItem,
	AccordionPanel,
} from '../../components/accordion'
import { Badge } from '../../components/badge'
import { Code } from '../../components/code'
import { Heading } from '../../components/heading'
import { Icon } from '../../components/icon'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '../../components/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import type { ComponentApi, PropDef } from '../component-api'

/** Split a type expression on top-level `|`, respecting nesting and strings. */
function splitUnion(type: string): string[] {
	const parts: string[] = []

	let depth = 0

	let inString: string | null = null

	let current = ''

	for (let i = 0; i < type.length; i++) {
		const ch = type[i]

		if (inString) {
			current += ch

			if (ch === inString && type[i - 1] !== '\\') inString = null

			continue
		}

		if (ch === "'" || ch === '"' || ch === '`') {
			inString = ch

			current += ch

			continue
		}

		if (ch === '{' || ch === '[' || ch === '(' || ch === '<') depth++
		else if (ch === '}' || ch === ']' || ch === ')') depth--
		else if (ch === '>' && type[i - 1] !== '=') depth--

		if (ch === '|' && depth === 0) {
			if (current.trim()) parts.push(current.trim())

			current = ''

			continue
		}

		current += ch
	}

	if (current.trim()) parts.push(current.trim())

	return parts
}

function TypeBadges({ type }: { type: string }) {
	const parts = splitUnion(type)

	return (
		<div className="flex flex-wrap items-center gap-1">
			{parts.map((t) => (
				<Badge key={t} color="zinc" className="dark:text-white">
					{t.replace(/^'|'$/g, '')}
				</Badge>
			))}
		</div>
	)
}

/**
 * Renders the Type cell of the props table. Simple types (primitives, literals,
 * and unions thereof) render as plain badges. Anything that references a named
 * component type — at any nesting depth — becomes a toggle that reveals each
 * referenced type's shape on click.
 */
function TypeCell({
	type,
	references,
	externalFrom,
}: {
	type: string
	references?: Record<string, string>
	externalFrom?: string
}) {
	const [expanded, setExpanded] = useState(false)

	if (externalFrom) {
		return (
			<Tooltip>
				<TooltipTrigger>
					<Badge variant="outline">{type}</Badge>
				</TooltipTrigger>
				<TooltipContent>
					Type imported from <span className="font-semibold">{externalFrom}</span>
				</TooltipContent>
			</Tooltip>
		)
	}

	const refEntries = references ? Object.entries(references) : []

	if (refEntries.length === 0) {
		return <TypeBadges type={type} />
	}

	return (
		<div className="space-y-1.5">
			<button
				type="button"
				aria-expanded={expanded}
				onClick={() => setExpanded((v) => !v)}
				className="group flex cursor-pointer items-center gap-1.5 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
			>
				<TypeBadges type={type} />
				<Icon
					icon={<ChevronDown />}
					className={`size-4 text-zinc-400 transition-transform dark:text-zinc-500 ${
						expanded ? 'rotate-180' : ''
					}`}
				/>
			</button>
			{expanded && (
				<div className="space-y-1.5 border-zinc-200 border-l pl-2 text-sm dark:border-zinc-800">
					{refEntries.map(([name, def]) => (
						<div key={name} className="flex flex-wrap items-baseline gap-2">
							<TypeBadges type={def} />
						</div>
					))}
				</div>
			)}
		</div>
	)
}

function PropRowsTable({ rows }: { rows: PropDef[] }) {
	return (
		<Table>
			<TableHead>
				<TableRow>
					<TableHeader>Prop</TableHeader>
					<TableHeader>Type</TableHeader>
					<TableHeader>Default</TableHeader>
				</TableRow>
			</TableHead>
			<TableBody>
				{rows.map((prop) => (
					<TableRow key={prop.name}>
						<TableCell className="font-mono font-medium align-top">{prop.name}</TableCell>
						<TableCell>
							<TypeCell
								type={prop.type}
								references={prop.references}
								externalFrom={prop.externalFrom}
							/>
						</TableCell>
						<TableCell className="font-mono text-zinc-500 dark:text-zinc-400 align-top">
							{prop.default ?? '—'}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	)
}

function ComponentEntry({ entry }: { entry: ComponentApi }) {
	const visibleProps = entry.props.filter((p) => p.type !== 'never')

	const events = visibleProps
		.filter((p) => /^on[A-Z]/.test(p.name))
		.sort((a, b) => a.name.localeCompare(b.name))

	const props = visibleProps
		.filter((p) => !/^on[A-Z]/.test(p.name))
		.sort((a, b) => a.name.localeCompare(b.name))

	const passThrough = entry.passThrough ?? []

	return (
		<div className="space-y-4">
			{visibleProps.length === 0 ? (
				<p className="text-sm text-zinc-500 dark:text-zinc-400">
					This component accepts no explicit props.
				</p>
			) : (
				<div className="space-y-6">
					{props.length > 0 && (
						<div className="space-y-4">
							<Heading level={4}>Props</Heading>
							<PropRowsTable rows={props} />
						</div>
					)}
					{events.length > 0 && (
						<div className="space-y-4">
							<Heading level={4}>Events</Heading>
							<PropRowsTable rows={events} />
						</div>
					)}
				</div>
			)}
			{passThrough.length > 0 && (
				<div className="flex flex-wrap items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
					<span>Also accepts all</span>
					{passThrough.map((pt, i) => (
						<span key={pt.element} className="flex items-center gap-1.5">
							<Code className="font-mono dark:text-white">{`<${pt.element}>`}</Code>
							{i < passThrough.length - 1 && <span>,</span>}
						</span>
					))}
					<span>HTML attributes.</span>
				</div>
			)}
		</div>
	)
}

export function ApiReference({ api }: { api: ComponentApi[] }) {
	return (
		<Accordion type="multiple">
			{api.map((entry) => (
				<AccordionItem key={entry.name} value={entry.name}>
					<AccordionButton className="font-mono">{`<${entry.name} />`}</AccordionButton>
					<AccordionPanel>
						<ComponentEntry entry={entry} />
					</AccordionPanel>
				</AccordionItem>
			))}
		</Accordion>
	)
}
