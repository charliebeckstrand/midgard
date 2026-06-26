'use client'

import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../../../../components/badge'
import { Button } from '../../../../components/button'
import { CodeBlock } from '../../../../components/code'
import { Flex } from '../../../../components/flex'
import { Heading } from '../../../../components/heading'
import { Icon } from '../../../../components/icon'
import {
	Sheet,
	SheetBody,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from '../../../../components/sheet'
import { Stack } from '../../../../components/stack'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../components/tooltip'
import { GlassProvider } from '../../../../providers/glass'
import type { PropDef } from '../../api-reference/types'

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

/**
 * One badge per top-level union arm: `'sm' | 'md'` renders as two badges.
 * Identical arms collapse to a single badge — a union can format to repeated
 * text (e.g. two type parameters that both resolve to `string`), which would
 * otherwise render redundant badges and collide on the React key.
 */
function TypeBadges({ type }: { type: string }) {
	const arms = [...new Set(splitUnion(type))]

	return (
		<Flex gap="sm" align="center" wrap>
			{arms.map((part) => (
				<Badge key={part} variant="soft">
					{unquote(part)}
				</Badge>
			))}
		</Flex>
	)
}

/**
 * Each entry is titled by the type name it resolves. Multi-line definitions
 * render as `<CodeBlock>`; single-line definitions reuse the prop-list
 * badges.
 */
function ReferencesPanel({ references }: { references: Record<string, string> }) {
	const entries = Object.entries(references)

	if (entries.length === 0) return null

	return (
		<Stack gap="lg">
			{entries.map(([name, def]) => (
				<Stack key={name} gap="sm">
					<Heading level={5}>{name}</Heading>
					{def.includes('\n') ? <CodeBlock code={def} /> : <TypeBadges type={def} />}
				</Stack>
			))}
		</Stack>
	)
}

/**
 * Type-column cell. Picks one of three modes:
 *
 *   - **External**: outline badge with a source-package tooltip.
 *   - **References**: bare type plus a Sheet trigger for the resolved
 *     definitions of every referenced alias.
 *   - **Simple** (default): plain badges via `TypeBadges`.
 */
export function TypeCell({ prop }: { prop: PropDef }) {
	const [open, setOpen] = useState(false)

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

	const hasReferences = !!prop.references && Object.keys(prop.references).length > 0

	if (!hasReferences) {
		return <TypeBadges type={prop.type} />
	}

	return (
		<>
			<Flex gap="sm" direction={{ initial: 'col', xl: 'row' }} wrap>
				<Badge variant="soft">{prop.type}</Badge>
				<Button size="sm" variant="bare" onClick={() => setOpen(true)}>
					View references
					<Icon icon={<ChevronRight />} />
				</Button>
			</Flex>
			<GlassProvider>
				<Sheet open={open} onOpenChange={setOpen}>
					<SheetHeader>
						<SheetTitle className="font-mono">{prop.name}</SheetTitle>
						<SheetDescription className="font-mono">{prop.type}</SheetDescription>
					</SheetHeader>
					<SheetBody>
						<ReferencesPanel references={prop.references ?? {}} />
					</SheetBody>
					<SheetFooter>
						<Button onClick={() => setOpen(false)}>Close</Button>
					</SheetFooter>
				</Sheet>
			</GlassProvider>
		</>
	)
}
