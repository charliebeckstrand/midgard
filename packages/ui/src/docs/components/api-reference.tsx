'use client'

import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
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
import type { ComponentApi } from '../parse-props'

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
 * Renders the Type cell of the props table. When the prop has no breakdown
 * it's shown as plain badges; when a breakdown exists the cell becomes a
 * toggle button that reveals the expanded form on click.
 */
function TypeCell({ type, breakdown }: { type: string; breakdown?: string }) {
	const [expanded, setExpanded] = useState(false)

	if (!breakdown) {
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
				<div className="flex items-start gap-1.5 border-zinc-200 border-l pl-2 text-xs dark:border-zinc-800">
					<TypeBadges type={breakdown} />
				</div>
			)}
		</div>
	)
}

export function PropsTable({ api }: { api: ComponentApi[] }) {
	return (
		<div className="space-y-8">
			{api.map((entry) => {
				const visibleProps = entry.props.filter((p) => p.type !== 'never')

				const passThrough = entry.passThrough ?? []

				return (
					<div key={entry.name} className="space-y-3">
						<Heading level={3} className="font-mono">{`<${entry.name} />`}</Heading>
						{visibleProps.length > 0 ? (
							<Table>
								<TableHead>
									<TableRow>
										<TableHeader>Prop</TableHeader>
										<TableHeader>Type</TableHeader>
										<TableHeader>Default</TableHeader>
									</TableRow>
								</TableHead>
								<TableBody>
									{visibleProps.map((prop) => (
										<TableRow key={prop.name}>
											<TableCell className="font-mono font-medium align-top">{prop.name}</TableCell>
											<TableCell>
												<TypeCell type={prop.type} breakdown={prop.breakdown} />
											</TableCell>
											<TableCell className="font-mono text-zinc-500 dark:text-zinc-400 align-top">
												{prop.default ?? '—'}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						) : (
							<p className="text-sm text-zinc-500 dark:text-zinc-400">
								This component accepts no explicit props.
							</p>
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
			})}
		</div>
	)
}
