'use client'

import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '../../../components/badge'
import { CodeBlock } from '../../../components/code'
import { Collapse, CollapsePanel, CollapseTrigger } from '../../../components/collapse'
import { Flex } from '../../../components/flex'
import { Heading } from '../../../components/heading'
import { Icon } from '../../../components/icon'
import { Spacer } from '../../../components/spacer'
import { Stack } from '../../../components/stack'
import { Text } from '../../../components/text'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/tooltip'
import type { PropDef } from '../../api-reference/types'

/**
 * Expandable definition rows, one per prop. A row header carries the name,
 * required marker, type summary, and default; the JSDoc description sits
 * beneath it. Rows with more to show (a usage snippet, referenced type
 * definitions) expand inline; the rest are plain lines.
 */
export function PropRows({ rows }: { rows: PropDef[] }) {
	return (
		<div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
			{rows.map((prop) => (
				<PropRow key={prop.name} prop={prop} />
			))}
		</div>
	)
}

function PropRow({ prop }: { prop: PropDef }) {
	const references = Object.entries(prop.references ?? {})

	if (!prop.usage && references.length === 0) {
		return (
			<div className="px-4 py-3">
				<RowHeader prop={prop} />
			</div>
		)
	}

	return (
		<Collapse animate="slide" className="group/prop-row">
			<CollapseTrigger className="block w-full px-4 py-3 text-left focus-visible:-outline-offset-2">
				<RowHeader prop={prop} expandable />
			</CollapseTrigger>
			<CollapsePanel>
				<Stack gap="lg" className="px-4 pt-1 pb-4">
					{prop.usage && (
						<DetailSection title="Usage">
							<CodeBlock code={prop.usage} />
						</DetailSection>
					)}
					{references.map(([name, definition]) => (
						<DetailSection key={name} title={name}>
							{definition.includes('\n') ? (
								<CodeBlock code={definition} />
							) : (
								<TypeBadges type={definition} />
							)}
						</DetailSection>
					))}
				</Stack>
			</CollapsePanel>
		</Collapse>
	)
}

function RowHeader({ prop, expandable }: { prop: PropDef; expandable?: boolean }) {
	return (
		<div className="space-y-1">
			<Flex align="center" gap="md" wrap>
				<span className="font-mono text-sm font-medium">
					{prop.name}
					{prop.required && (
						<span className="text-red-600 dark:text-red-400">
							<span aria-hidden>*</span>
							<span className="sr-only">(required)</span>
						</span>
					)}
				</span>
				<TypeSummary prop={prop} />
				<Spacer />
				{prop.default && (
					<span className="font-mono text-xs whitespace-nowrap text-zinc-500 dark:text-zinc-400">
						default: {prop.default}
					</span>
				)}
				{expandable && (
					<Icon
						icon={<ChevronRight />}
						className="text-zinc-400 transition-transform group-data-[open]/prop-row:rotate-90"
					/>
				)}
			</Flex>
			{prop.description && (
				<Text variant="muted" className="text-sm">
					{prop.description}
				</Text>
			)}
		</div>
	)
}

/**
 * Type column of the row header. External types render as an outline badge
 * naming their source package on hover; everything else renders as badges,
 * one per top-level union arm.
 */
function TypeSummary({ prop }: { prop: PropDef }) {
	if (prop.externalFrom) {
		return (
			<Tooltip>
				<TooltipTrigger>
					<Badge variant="outline">{prop.type}</Badge>
				</TooltipTrigger>
				<TooltipContent>
					Type imported from <span className="font-semibold">{prop.externalFrom}</span>
				</TooltipContent>
			</Tooltip>
		)
	}

	return <TypeBadges type={prop.type} />
}

/**
 * One badge per top-level union arm: `'sm' | 'md'` renders as two badges.
 * Function types stay whole (their return-type unions are not arms), and
 * repeated arms collapse: badges key by their text.
 */
function TypeBadges({ type }: { type: string }) {
	const parts = type.includes('=>') ? [type] : [...new Set(splitUnion(type))]

	return (
		<Flex gap="sm" align="center" wrap>
			{parts.map((part) => (
				<Badge key={part}>{unquote(part)}</Badge>
			))}
		</Flex>
	)
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
	return (
		<Stack gap="sm">
			<Heading level={5}>{title}</Heading>
			{children}
		</Stack>
	)
}

/** Split a type expression on top-level `|`, ignoring `|` inside nesting and strings. */
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

/** Strip the enclosing single quotes from a string-literal fragment. */
function unquote(part: string): string {
	return part.replace(/^'|'$/g, '')
}
