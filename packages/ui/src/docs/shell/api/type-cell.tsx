import type { PropDef } from 'docs/extractor'
import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Badge } from 'ui/badge'
import { Button } from 'ui/button'
import { CodeBlock } from 'ui/code'
import { Flex } from 'ui/flex'
import { Heading } from 'ui/heading'
import { Icon } from 'ui/icon'
import { GlassProvider } from 'ui/providers/glass'
import { Sheet, SheetBody, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from 'ui/sheet'
import { Stack } from 'ui/stack'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'

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

/** Strip a matching pair of enclosing quotes (`'`, `"`, or backtick) from a string-literal fragment. */
function unquote(part: string): string {
	return part.replace(/^(['"`])([\s\S]*)\1$/, '$2')
}

/**
 * One badge per top-level union arm: `'sm' | 'md'` renders as two badges.
 * Identical arms collapse to a single badge — a union can format to repeated
 * text (e.g. two type parameters that both resolve to `string`), which would
 * otherwise render redundant badges and collide on the React key.
 */
export function TypeBadges({ type }: { type: string }) {
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

/** The rendered facet of a prop, param, or return type — everything `TypeReference` needs. */
export type TypeFacet = {
	/** Title for the references sheet — the prop/param name, or `'Returns'`. */
	label: string
	type: string
	references?: Record<string, string>

	/** External package the type originates from, e.g. `@floating-ui/react`. */
	externalFrom?: string
}

/**
 * Renders a type expression in one of three modes, shared by prop, parameter,
 * and return rows:
 *
 *   - **External**: outline badge with a source-package tooltip.
 *   - **References**: bare type plus a Sheet trigger for the resolved
 *     definitions of every referenced alias.
 *   - **Simple** (default): plain badges via {@link TypeBadges}.
 */
export function TypeReference({ label, type, references, externalFrom }: TypeFacet) {
	const [open, setOpen] = useState(false)

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

	const hasReferences = !!references && Object.keys(references).length > 0

	if (!hasReferences) {
		return <TypeBadges type={type} />
	}

	return (
		<>
			<Flex gap="sm" direction={{ initial: 'col', xl: 'row' }} wrap>
				<Badge variant="soft">{type}</Badge>
				<Button size="sm" variant="bare" onClick={() => setOpen(true)}>
					View references
					<Icon icon={<ChevronRight />} />
				</Button>
			</Flex>
			<GlassProvider>
				<Sheet open={open} onOpenChange={setOpen}>
					<SheetHeader>
						<SheetTitle className="font-mono">{label}</SheetTitle>
						<SheetDescription className="font-mono">{type}</SheetDescription>
					</SheetHeader>
					<SheetBody>
						<ReferencesPanel references={references ?? {}} />
					</SheetBody>
					<SheetFooter>
						<Button onClick={() => setOpen(false)}>Close</Button>
					</SheetFooter>
				</Sheet>
			</GlassProvider>
		</>
	)
}

/** Type-column cell for a prop row; a thin adapter over {@link TypeReference}. */
export function TypeCell({ prop }: { prop: PropDef }) {
	return (
		<TypeReference
			label={prop.name}
			type={prop.type}
			references={prop.references}
			externalFrom={prop.externalFrom}
		/>
	)
}
