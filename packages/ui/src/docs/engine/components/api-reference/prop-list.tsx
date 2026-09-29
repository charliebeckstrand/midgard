'use client'

import { useState } from 'react'
import { Badge } from '../../../../components/badge'
import { Button } from '../../../../components/button'
import { CodeBlock } from '../../../../components/code'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../components/tooltip'
import { cn } from '../../../../core'
import { Stack } from '../../../../structure/stack'
import type { PropDef } from '../../api-reference/types'
import { isProseDefault } from './default-value'
import { DocDescription, splitDescription } from './doc-description'
import { PropSignature } from './prop-signature'

/**
 * Prop entries. Each row leads with the name, then one line of facts via
 * `PropSignature`: the type, the options, and the default. The description
 * follows at full width. Its first paragraph shows, and the rest folds behind a
 * toggle. A default that is a sentence joins the folded text. Absent fields
 * drop out, so an undocumented prop collapses to name and type.
 */
export function PropList({ rows }: { rows: PropDef[] }) {
	return (
		<div className="divide-y divide-zinc-200 dark:divide-zinc-800">
			{rows.map((prop) => (
				<PropRow key={prop.name} prop={prop} />
			))}
		</div>
	)
}

function PropRow({ prop }: { prop: PropDef }) {
	const { deprecated } = prop

	const { summary, detail } = splitDescription(prop.description ?? '')

	const proseDefault = prop.default && isProseDefault(prop.default) ? prop.default : undefined

	const folded = [detail, proseDefault && `Default: ${proseDefault}`].filter(Boolean).join('\n\n')

	return (
		<Stack gap="sm" className="py-4 first:pt-0 last:pb-0">
			<span
				className={cn(
					'flex flex-wrap items-center gap-2 font-mono font-medium text-zinc-900 dark:text-white',
					deprecated && 'line-through decoration-zinc-400',
				)}
			>
				<span>
					{prop.name}
					{prop.required && (
						<span className="text-red-600 dark:text-red-500">
							<span aria-hidden> *</span>
							<span className="sr-only"> required</span>
						</span>
					)}
				</span>
				{deprecated && (
					<Tooltip>
						<TooltipTrigger>
							<Badge color="red" variant="soft" size="sm">
								deprecated
							</Badge>
						</TooltipTrigger>
						{typeof deprecated === 'string' && <TooltipContent>{deprecated}</TooltipContent>}
					</Tooltip>
				)}
			</span>
			<PropSignature prop={prop} />
			<DocDescription description={summary} />
			{folded && <Folded description={folded} />}
			{prop.example && <CodeBlock code={prop.example} />}
		</Stack>
	)
}

/** The long part of a description, hidden until asked for. */
function Folded({ description }: { description: string }) {
	const [open, setOpen] = useState(false)

	return (
		<>
			{open && <DocDescription description={description} />}
			<Button
				size="sm"
				variant="bare"
				className="-ml-2 self-start"
				aria-expanded={open}
				onClick={() => setOpen(!open)}
			>
				{open ? 'Show less' : 'Read more'}
			</Button>
		</>
	)
}
