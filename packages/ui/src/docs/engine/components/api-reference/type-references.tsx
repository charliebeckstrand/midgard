'use client'

import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../../../../components/badge'
import { Button } from '../../../../components/button'
import { CodeBlock } from '../../../../components/code'
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
import { GlassProvider } from '../../../../providers/glass'
import { Flex } from '../../../../structure/flex'
import { Stack } from '../../../../structure/stack'
import type { PropDef } from '../../api-reference/types'
import { splitTopLevel } from '../../split-top-level'

/** Split a type expression on top-level `|`, ignoring `|` inside nesting and strings. */
export function splitUnion(type: string): string[] {
	return splitTopLevel(type, '|', true)
}

/** Strip a matching pair of enclosing quotes (`'`, `"`, or backtick) from a string-literal fragment. */
export function unquote(part: string): string {
	return part.replace(/^(['"`])([\s\S]*)\1$/, '$2')
}

/**
 * One badge per top-level union arm: `'sm' | 'md'` renders as two badges.
 * Identical arms collapse to a single badge. A union can format to repeated
 * text, such as two type parameters that both resolve to `string`. Without the
 * collapse, those arms render redundant badges and collide on the React key.
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
 * A link-style button that opens a Sheet with the resolved definition of every
 * type a prop references. Renders nothing when the prop has no references.
 */
export function TypeReferences({ prop }: { prop: PropDef }) {
	const [open, setOpen] = useState(false)

	if (!prop.references || Object.keys(prop.references).length === 0) return null

	return (
		<>
			<Button size="sm" variant="bare" className="-ml-2" onClick={() => setOpen(true)}>
				View references
				<Icon icon={<ChevronRight />} />
			</Button>
			<GlassProvider>
				<Sheet open={open} onOpenChange={setOpen}>
					<SheetHeader>
						<SheetTitle className="font-mono">{prop.name}</SheetTitle>
						<SheetDescription className="font-mono">{prop.type}</SheetDescription>
					</SheetHeader>
					<SheetBody>
						<ReferencesPanel references={prop.references} />
					</SheetBody>
					<SheetFooter>
						<Button onClick={() => setOpen(false)}>Close</Button>
					</SheetFooter>
				</Sheet>
			</GlassProvider>
		</>
	)
}
