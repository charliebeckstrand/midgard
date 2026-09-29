'use client'

import { useState } from 'react'
import { Badge } from '../../../../components/badge'
import { Button } from '../../../../components/button'
import { CodeBlock } from '../../../../components/code'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../components/tooltip'
import { cn } from '../../../../core'
import { Stack } from '../../../../structure/stack'
import type { PropDef } from '../../api-reference/types'
import { DefaultValue, isProseDefault } from './default-value'
import { DocDescription, splitDescription } from './doc-description'
import { TypeCell } from './type-cell'

/**
 * Prop entries as a two-column rail. The left column carries the identity: name,
 * required and deprecated marks, and the type via `TypeCell`. The right column
 * carries the prose: the description summary, a labelled default, and
 * `@example`. The rest of the description folds behind a toggle. A default that
 * is a sentence joins that folded text. The columns stack below `sm`. Absent
 * fields drop out, so an undocumented prop collapses to name and type.
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

	const literalDefault = prop.default && !proseDefault ? prop.default : undefined

	const hasBody = !!(summary || folded || literalDefault || prop.example)

	return (
		<div className="grid gap-x-8 gap-y-2 py-4 first:pt-0 last:pb-0 sm:grid-cols-[12rem_minmax(0,1fr)]">
			<Stack gap="sm" className="min-w-0">
				<span
					className={cn(
						'flex flex-wrap items-center gap-2 break-all font-mono font-medium text-zinc-900 dark:text-white',
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
				<TypeCell prop={prop} />
			</Stack>
			{hasBody && (
				<Stack gap="sm" className="min-w-0">
					<DocDescription description={summary} />
					{folded && <Folded description={folded} />}
					{literalDefault && (
						<span className="text-sm text-zinc-500 dark:text-zinc-400">
							Default <DefaultValue value={literalDefault} />
						</span>
					)}
					{prop.example && <CodeBlock code={prop.example} />}
				</Stack>
			)}
		</div>
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
