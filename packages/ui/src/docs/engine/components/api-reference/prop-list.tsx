'use client'

import { Badge } from '../../../../components/badge'
import { CodeBlock } from '../../../../components/code'
import { Stack } from '../../../../components/stack'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../components/tooltip'
import { cn } from '../../../../core'
import type { PropDef } from '../../api-reference/types'
import { DefaultValue } from './default-value'
import { DocDescription } from './doc-description'
import { TypeCell } from './type-cell'

/**
 * Prop entries. Each row leads with the prop name, an optional info button whose
 * tooltip carries the prose summary, then the required / default / deprecated
 * badges, then the technical metadata (type via `TypeCell`, `@example`). The
 * info button and meta are omitted when absent, so undocumented props collapse
 * to name + type.
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
					{prop.required && <span className="text-red-600 dark:text-red-500"> *</span>}
					{prop.default && (
						<>
							{' '}
							<DefaultValue value={prop.default} />
						</>
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
			{prop.description && <DocDescription description={prop.description} />}
			{prop.example && <CodeBlock code={prop.example} />}
		</Stack>
	)
}
